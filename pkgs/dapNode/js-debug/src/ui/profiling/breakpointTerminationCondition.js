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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreakpointTerminationConditionFactory = void 0;
const inversify_1 = require("inversify");
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const nls = __importStar(require("vscode-nls"));
const objUtils_1 = require("../../common/objUtils");
const ioc_extras_1 = require("../../ioc-extras");
const localize = nls.loadMessageBundle();
const warnedKey = 'breakpointTerminationWarnedSlow';
let BreakpointTerminationConditionFactory = class BreakpointTerminationConditionFactory {
    constructor(fs, context) {
        this.fs = fs;
        this.context = context;
        this.sortOrder = 2;
        this.id = 'breakpoint';
        this.label = localize('profile.termination.breakpoint.label', 'Pick Breakpoint');
        this.description = localize('profile.termination.breakpoint.description', 'Run until a specific breakpoint is hit');
    }
    async onPick(session, breakpointIds) {
        if (breakpointIds) {
            return new BreakpointTerminationCondition(breakpointIds);
        }
        const quickPick = vscode.window.createQuickPick();
        quickPick.canSelectMany = true;
        quickPick.matchOnDescription = true;
        quickPick.busy = true;
        const chosen = await new Promise(resolve => {
            quickPick.onDidAccept(() => resolve(quickPick.selectedItems));
            quickPick.onDidHide(() => resolve());
            quickPick.onDidChangeActive(async (active) => {
                if (!active.length) {
                    return;
                }
                const location = active[0].location;
                const document = await vscode.workspace.openTextDocument(location.uri);
                vscode.window.showTextDocument(document, {
                    selection: location.range,
                    preview: true,
                    preserveFocus: true,
                });
            });
            quickPick.show();
            (async () => {
                const codeBps = vscode.debug.breakpoints.filter(bp => bp.enabled && bp instanceof vscode.SourceBreakpoint);
                const dapBps = await Promise.all(codeBps.map(bp => session.getDebugProtocolBreakpoint(bp)));
                const candidates = await this.getCandidates(dapBps, codeBps);
                quickPick.items = candidates;
                quickPick.selectedItems = candidates;
                quickPick.busy = false;
            })();
        });
        quickPick.dispose();
        if (!chosen) {
            return;
        }
        await this.warnSlowCode();
        return new BreakpointTerminationCondition(chosen.map(c => Number(c.id)));
    }
    async warnSlowCode() {
        if (this.context.workspaceState.get(warnedKey)) {
            return;
        }
        vscode.window.showWarningMessage(localize('breakpointTerminationWarnSlow', 'Profiling with breakpoints enabled can change the performance of your code. It can be useful to validate your findings with the "duration" or "manual" termination conditions.'), localize('breakpointTerminationWarnConfirm', 'Got it!'));
        await this.context.workspaceState.update(warnedKey, true);
    }
    async getCandidates(dapBps, codeBps) {
        if (dapBps.length !== codeBps.length) {
            throw new Error('Mismatched breakpoint array lengths');
        }
        const getLines = objUtils_1.memoize((f) => this.getFileLines(f));
        const candidates = await Promise.all(codeBps.map(async (codeBp, i) => {
            var _a;
            const dapBp = dapBps[i];
            if (!dapBp || !dapBp.id) {
                return; // does not apply to this session
            }
            const location = codeBp.location;
            const folder = vscode.workspace.getWorkspaceFolder(location.uri);
            const labelPath = folder
                ? path.relative(folder.uri.fsPath, location.uri.fsPath)
                : location.uri.fsPath;
            const lines = await getLines(location.uri.fsPath);
            return {
                id: dapBp.id,
                label: `${labelPath}:${location.range.start.line}:${location.range.start.character}`,
                location,
                description: (_a = lines === null || lines === void 0 ? void 0 : lines[location.range.start.line]) === null || _a === void 0 ? void 0 : _a.trim(),
            };
        }));
        return candidates.filter(objUtils_1.truthy);
    }
    async getFileLines(path) {
        try {
            const contents = await this.fs.readFile(path, 'utf-8');
            return contents.split('\n');
        }
        catch (_a) {
            return undefined;
        }
    }
};
BreakpointTerminationConditionFactory = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.FS)),
    __param(1, inversify_1.inject(ioc_extras_1.ExtensionContext))
], BreakpointTerminationConditionFactory);
exports.BreakpointTerminationConditionFactory = BreakpointTerminationConditionFactory;
class BreakpointTerminationCondition {
    constructor(breakpointIds) {
        this.breakpointIds = breakpointIds;
    }
    get customData() {
        return {
            stopAtBreakpoint: this.breakpointIds.slice(),
        };
    }
    dispose() {
        // no-op
    }
}
//# sourceMappingURL=breakpointTerminationCondition.js.map
//# sourceMappingURL=breakpointTerminationCondition.js.map
