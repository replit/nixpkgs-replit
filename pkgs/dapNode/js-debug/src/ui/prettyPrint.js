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
exports.PrettyPrintTrackerFactory = void 0;
const qs = __importStar(require("querystring"));
const vscode = __importStar(require("vscode"));
const vscode_1 = require("vscode");
const nls = __importStar(require("vscode-nls"));
const contributionUtils_1 = require("../common/contributionUtils");
const disposable_1 = require("../common/disposable");
const localize = nls.loadMessageBundle();
class PrettyPrintTrackerFactory {
    constructor(tracker) {
        this.tracker = tracker;
        this.sessions = new disposable_1.DisposableList();
    }
    /**
     * Attaches the tracker to the VS Code workspace.
     */
    static register(tracker) {
        const factory = new PrettyPrintTrackerFactory(tracker);
        for (const debugType of contributionUtils_1.allDebugTypes) {
            vscode.debug.registerDebugAdapterTrackerFactory(debugType, factory);
        }
        contributionUtils_1.registerCommand(vscode.commands, "extension.js-debug.prettyPrint" /* PrettyPrint */, () => factory.prettifyActive());
        return factory;
    }
    /**
     * @inheritdoc
     */
    createDebugAdapterTracker(session) {
        if (!contributionUtils_1.readConfig(vscode.workspace, "debug.javascript.suggestPrettyPrinting" /* SuggestPrettyPrinting */)) {
            return;
        }
        const tracker = new PrettyPrintSession(session);
        this.sessions.push(tracker);
        vscode.debug.onDidTerminateDebugSession(s => {
            if (s === session) {
                this.sessions.disposeObject(tracker);
            }
        });
        return tracker;
    }
    /**
     * Prettifies the active file in the editor.
     */
    async prettifyActive() {
        const editor = vscode.window.activeTextEditor;
        if ((editor === null || editor === void 0 ? void 0 : editor.document.languageId) !== 'javascript') {
            return;
        }
        const { sessionId, source } = sourceForUri(editor.document.uri);
        const session = sessionId && this.tracker.getById(sessionId);
        // For ephemeral files, they're attached to a single session, so go ahead
        // and send it to the owning session. For files on disk, send it to all
        // sessions--they will no-op if they don't know about the source.
        if (session) {
            sendPrintCommand(session, source, editor.selection.start);
        }
        else {
            for (const session of this.tracker.getConcreteSessions()) {
                sendPrintCommand(session, source, editor.selection.start);
            }
        }
    }
    /**
     * @inheritdoc
     */
    dispose() {
        this.sessions.dispose();
    }
}
exports.PrettyPrintTrackerFactory = PrettyPrintTrackerFactory;
/**
 * Session tracker for pretty printing. It monitors open files in the editor,
 * and suggests formatting ones that look minified.
 *
 * It can suggest printing ephemeral files that have a source reference set.
 * It will also suggest printing
 */
class PrettyPrintSession {
    constructor(session) {
        this.session = session;
        this.candidatePaths = new Set();
        this.disposable = new disposable_1.DisposableList();
        this.suggested = new Set();
        this.disposable.push(vscode.window.onDidChangeActiveTextEditor(editor => this.onEditorChange(editor)));
    }
    /**
     * @inheritdoc
     */
    onDidSendMessage(message) {
        var _a, _b, _c, _d;
        if (message.type !== 'response' || message.command !== 'stackTrace' || !message.body) {
            return;
        }
        const frames = message.body.stackFrames;
        if (!frames) {
            return;
        }
        for (const frame of frames) {
            const path = (_a = frame.source) === null || _a === void 0 ? void 0 : _a.path;
            if (path) {
                this.candidatePaths.add(path);
            }
        }
        // If the file that's currently opened is the top of the stacktrace,
        // indicating we're probably about to break on it, then prompt immediately.
        const first = (_c = (_b = frames[0]) === null || _b === void 0 ? void 0 : _b.source) === null || _c === void 0 ? void 0 : _c.path;
        if (first && ((_d = vscode.window.activeTextEditor) === null || _d === void 0 ? void 0 : _d.document.uri.path) === first) {
            this.onEditorChange(vscode.window.activeTextEditor);
        }
    }
    /**
     * @inheritdoc
     */
    dispose() {
        this.disposable.dispose();
    }
    onEditorChange(editor) {
        if ((editor === null || editor === void 0 ? void 0 : editor.document.languageId) !== 'javascript') {
            return;
        }
        const { source } = sourceForUri(editor.document.uri);
        if (!this.candidatePaths.has(source.path) && source.sourceReference === 0) {
            return;
        }
        const key = source.sourceReference || source.path;
        if (this.suggested.has(key)) {
            return;
        }
        this.suggested.add(key);
        if (!isMinified(editor.document)) {
            return;
        }
        return this.trySuggestPrinting(source, editor.selection.start);
    }
    async trySuggestPrinting(source, cursor) {
        const canPrettyPrint = await this.session.customRequest('canPrettyPrintSource', {
            source,
        });
        if (!(canPrettyPrint === null || canPrettyPrint === void 0 ? void 0 : canPrettyPrint.canPrettyPrint)) {
            return;
        }
        const yes = localize('yes', 'Yes');
        const no = localize('no', 'No');
        const never = localize('never', 'Never');
        const response = await vscode.window.showInformationMessage('This JavaScript file seems to be minified.\nWould you like to pretty print it?', yes, no, never);
        if (response === yes) {
            sendPrintCommand(this.session, source, cursor);
        }
        else if (response === never) {
            contributionUtils_1.writeConfig(vscode.workspace, "debug.javascript.suggestPrettyPrinting" /* SuggestPrettyPrinting */, false, vscode_1.ConfigurationTarget.Global);
        }
    }
}
const sendPrintCommand = (session, source, cursor) => session.customRequest('prettyPrintSource', {
    source,
    line: cursor.line,
    column: cursor.character,
});
/**
 * Gets the DAP source and session for a VS Code document URI.
 */
const sourceForUri = (uri) => {
    const query = qs.parse(uri.query);
    const sessionId = query['session'];
    const source = {
        path: uri.fsPath,
        sourceReference: Number(query['ref']) || 0,
    };
    return { sessionId, source };
};
/**
 * Heuristic check to see if a document is minified.
 */
function isMinified(document) {
    const maxNonMinifiedLength = 500;
    const linesToCheck = 10;
    for (let i = 0; i < linesToCheck && i < document.lineCount; ++i) {
        const line = document.lineAt(i).text;
        if (line.length > maxNonMinifiedLength && !line.startsWith('//#')) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=prettyPrint.js.map
//# sourceMappingURL=prettyPrint.js.map
