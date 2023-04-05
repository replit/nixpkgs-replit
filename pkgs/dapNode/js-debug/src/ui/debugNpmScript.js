"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findScripts = exports.debugNpmScript = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const nls = __importStar(require("vscode-nls"));
const contributionUtils_1 = require("../common/contributionUtils");
const fsUtils_1 = require("../common/fsUtils");
const getRunScriptCommand_1 = require("./getRunScriptCommand");
const localize = nls.loadMessageBundle();
/**
 * Opens a quickpick and them subsequently debugs a configured npm script.
 * @param inFolder - Optionally scopes lookups to the given workspace folder
 */
async function debugNpmScript(inFolder) {
    const scripts = await findScripts(inFolder ? [inFolder] : undefined);
    if (!scripts) {
        return; // cancelled
    }
    const runScript = async (script) => {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(script.directory));
        contributionUtils_1.runCommand(vscode.commands, "extension.js-debug.createDebuggerTerminal" /* CreateDebuggerTerminal */, await getRunScriptCommand_1.getRunScriptCommand(script.name, workspaceFolder), workspaceFolder, { cwd: script.directory });
    };
    if (scripts.length === 1) {
        return runScript(scripts[0]);
    }
    // For multi-root workspaces, prefix the script name with the workspace
    // directory name so the user knows where it's coming from.
    const multiDir = scripts.some(s => s.directory !== scripts[0].directory);
    const quickPick = vscode.window.createQuickPick();
    quickPick.items = scripts.map(script => ({
        script,
        label: multiDir ? `${path.basename(script.directory)}: ${script.name}` : script.name,
        description: script.command,
    }));
    quickPick.onDidAccept(async () => {
        runScript(quickPick.selectedItems[0].script);
        quickPick.dispose();
    });
    quickPick.show();
}
exports.debugNpmScript = debugNpmScript;
const updateEditCandidate = (existing, updated) => existing.score > updated.score ? existing : updated;
/**
 * Finds configured npm scripts in the workspace.
 */
async function findScripts(inFolders, silent = false) {
    var _a, _b;
    const folders = (_b = inFolders !== null && inFolders !== void 0 ? inFolders : (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a.map(f => f.uri.fsPath)) !== null && _b !== void 0 ? _b : [];
    // 1. If there are no open folders, show an error and abort.
    if (!folders || folders.length === 0) {
        if (!silent) {
            vscode.window.showErrorMessage(localize('debug.npm.noWorkspaceFolder', 'You need to open a workspace folder to debug npm scripts.'));
        }
        return;
    }
    // Otherwise, go through all package.json's in the folder and pull all the npm scripts we find.
    const candidates = folders.map(directory => path.join(directory, 'package.json'));
    const scripts = [];
    // editCandidate is the file we'll edit if we don't find any npm scripts.
    // We 'narrow' this as we parse to files that look more like a package.json we want
    let editCandidate = { path: candidates[0], score: 0 };
    for (const packageJson of candidates) {
        if (!fs.existsSync(packageJson)) {
            continue;
        }
        // update this now, because we know it exists
        editCandidate = updateEditCandidate(editCandidate, {
            path: packageJson,
            score: 1,
        });
        let parsed;
        try {
            parsed = JSON.parse(await fsUtils_1.readfile(packageJson));
        }
        catch (e) {
            if (!silent) {
                promptToOpen('showWarningMessage', localize('debug.npm.parseError', 'Could not read {0}: {1}', packageJson, e.message), packageJson);
            }
            // set the candidate to 'undefined', since we already displayed an error
            // and if there are no other candidates then that alone is fine.
            editCandidate = updateEditCandidate(editCandidate, { path: undefined, score: 3 });
            continue;
        }
        // update this now, because we know it is valid
        editCandidate = updateEditCandidate(editCandidate, { path: undefined, score: 2 });
        if (!parsed.scripts) {
            continue;
        }
        for (const key of Object.keys(parsed.scripts)) {
            scripts.push({
                directory: path.dirname(packageJson),
                name: key,
                command: parsed.scripts[key],
            });
        }
    }
    if (scripts.length === 0) {
        if (editCandidate.path && !silent) {
            promptToOpen('showErrorMessage', localize('debug.npm.noScripts', 'No npm scripts found in your package.json'), editCandidate.path);
        }
        return;
    }
    scripts.sort((a, b) => (a.name === 'start' ? -1 : 0) + (b.name === 'start' ? 1 : 0));
    return scripts;
}
exports.findScripts = findScripts;
const defaultPackageJsonContents = `{\n  "scripts": {\n    \n  }\n}\n`;
async function promptToOpen(method, message, file) {
    const openAction = localize('debug.npm.notFound.open', 'Edit package.json');
    if ((await vscode.window[method](message, openAction)) !== openAction) {
        return;
    }
    // If the file exists, open it, otherwise create a new untitled file and
    // fill it in with some minimal "scripts" section.
    if (fs.existsSync(file)) {
        const document = await vscode.workspace.openTextDocument(file);
        await vscode.window.showTextDocument(document);
        return;
    }
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file).with({ scheme: 'untitled' }));
    const editor = await vscode.window.showTextDocument(document);
    await editor.edit(e => e.insert(new vscode.Position(0, 0), defaultPackageJsonContents));
    const pos = new vscode.Position(2, 5);
    editor.selection = new vscode.Selection(pos, pos);
}
//# sourceMappingURL=debugNpmScript.js.map
//# sourceMappingURL=debugNpmScript.js.map
