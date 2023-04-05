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
exports.registerCustomBreakpointsUI = void 0;
const vscode = __importStar(require("vscode"));
const customBreakpoints_1 = require("../adapter/customBreakpoints");
const events_1 = require("../common/events");
const debugSessionTracker_1 = require("./debugSessionTracker");
class Breakpoint {
    constructor(cb, enabled) {
        this.id = cb.id;
        this.enabled = enabled;
        this.label = `${cb.group}: ${cb.title}`;
        this.treeItem = new vscode.TreeItem(this.label);
        this.treeItem.id = cb.id;
    }
    static compare(a, b) {
        return a.label.localeCompare(b.label);
    }
}
class BreakpointsDataProvider {
    constructor(debugSessionTracker) {
        this._onDidChangeTreeData = new events_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.breakpoints = [];
        for (const cb of customBreakpoints_1.customBreakpoints().values())
            this.breakpoints.push(new Breakpoint(cb, false));
        this._debugSessionTracker = debugSessionTracker;
        debugSessionTracker.onSessionAdded(session => {
            if (!debugSessionTracker_1.DebugSessionTracker.isConcreteSession(session)) {
                return;
            }
            session.customRequest('enableCustomBreakpoints', {
                ids: this.breakpoints.filter(b => b.enabled).map(b => b.id),
            });
        });
    }
    getTreeItem(item) {
        return item.treeItem;
    }
    async getChildren(item) {
        if (!item)
            return this.breakpoints.filter(b => b.enabled).sort(Breakpoint.compare);
        return [];
    }
    async getParent() {
        return undefined;
    }
    addBreakpoints(breakpoints) {
        for (const breakpoint of breakpoints)
            breakpoint.enabled = true;
        const ids = breakpoints.map(b => b.id);
        for (const session of this._debugSessionTracker.getConcreteSessions())
            session.customRequest('enableCustomBreakpoints', { ids });
        this._onDidChangeTreeData.fire(undefined);
    }
    removeBreakpoints(breakpointIds) {
        const ids = new Set(breakpointIds);
        for (const breakpoint of this.breakpoints) {
            if (ids.has(breakpoint.id))
                breakpoint.enabled = false;
        }
        for (const session of this._debugSessionTracker.getConcreteSessions())
            session.customRequest('disableCustomBreakpoints', { ids: breakpointIds });
        this._onDidChangeTreeData.fire(undefined);
    }
}
function registerCustomBreakpointsUI(context, debugSessionTracker) {
    const provider = new BreakpointsDataProvider(debugSessionTracker);
    vscode.window.createTreeView("jsBrowserBreakpoints" /* BrowserBreakpointsView */, {
        treeDataProvider: provider,
    });
    context.subscriptions.push(vscode.commands.registerCommand("extension.js-debug.addCustomBreakpoints" /* AddCustomBreakpoints */, () => {
        const quickPick = vscode.window.createQuickPick();
        const items = provider.breakpoints.filter(b => !b.enabled);
        quickPick.items = items;
        quickPick.onDidAccept(() => {
            provider.addBreakpoints(quickPick.selectedItems);
            quickPick.dispose();
        });
        quickPick.show();
    }));
    context.subscriptions.push(vscode.commands.registerCommand("extension.js-debug.removeAllCustomBreakpoints" /* RemoveAllCustomBreakpoints */, () => {
        provider.removeBreakpoints(provider.breakpoints.filter(b => b.enabled).map(b => b.id));
    }));
    context.subscriptions.push(vscode.commands.registerCommand("extension.js-debug.removeCustomBreakpoint" /* RemoveCustomBreakpoint */, (treeItem) => {
        provider.removeBreakpoints([treeItem.id]);
    }));
}
exports.registerCustomBreakpointsUI = registerCustomBreakpointsUI;
//# sourceMappingURL=customBreakpointsUI.js.map
//# sourceMappingURL=customBreakpointsUI.js.map
