"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.IExtensionContribution = exports.disposeContainer = exports.trackDispose = exports.SessionSubStates = exports.BrowserFinder = exports.ExtensionLocation = exports.FS = exports.Execa = exports.ProcessEnv = exports.ExtensionContext = exports.IsVSCode = exports.VSCodeApi = exports.IInitializeParams = exports.StoragePath = exports.IContainer = void 0;
/**
 * The IOC container itself.
 */
exports.IContainer = Symbol('IContainer');
/**
 * Token for the string that points to a temporary storage directory.
 */
exports.StoragePath = Symbol('StoragePath');
/**
 * Key for the Dap.InitializeParams.
 */
exports.IInitializeParams = Symbol('IInitializeParams');
/**
 * Key for the VS Code API. Only available in the extension.
 */
exports.VSCodeApi = Symbol('VSCodeApi');
/**
 * Key for whether vs code services are available here.
 */
exports.IsVSCode = Symbol('IsVSCode');
/**
 * Key for the vscode.ExtensionContext. Only available in the extension.
 */
exports.ExtensionContext = Symbol('ExtensionContext');
/**
 * Process environment.
 */
exports.ProcessEnv = Symbol('ProcessEnv');
/**
 * Injection for the execa module.
 * @see https://github.com/sindresorhus/execa
 */
exports.Execa = Symbol('execa');
/**
 * Injection for the `fs.promises` module.
 */
exports.FS = Symbol('FS');
/**
 * Location the extension is running.
 */
exports.ExtensionLocation = 'ExtensionLocation';
/**
 * Symbol for `vscode-js-debug-browsers`'s IBrowserFinder.
 */
exports.BrowserFinder = Symbol('IBrowserFinder');
/**
 * An ObservableMap<string, string> containing custom substates for sessions.
 * This is used to add the "profiling" state to session names. Eventually, this
 * handling may move to DAP.
 *
 * @see https://github.com/microsoft/vscode/issues/94812
 * @see https://github.com/microsoft/debug-adapter-protocol/issues/108
 */
exports.SessionSubStates = Symbol('SessionSubStates');
const toDispose = new WeakMap();
/**
 * An inversify `onActivation` that registers the instance to be disposed
 * of when `disposeContainer` is called.
 */
exports.trackDispose = (ctx, service) => {
    if (!(typeof service === 'object' && service && 'dispose' in service)) {
        return service;
    }
    const disposable = service;
    const list = toDispose.get(ctx.container);
    if (!list) {
        toDispose.set(ctx.container, [disposable]);
    }
    else {
        list.push(disposable);
    }
    return service;
};
/**
 * Disposes all disposable services in the given container.
 */
exports.disposeContainer = (container) => {
    var _a;
    (_a = toDispose.get(container)) === null || _a === void 0 ? void 0 : _a.forEach(d => d.dispose());
};
exports.IExtensionContribution = Symbol('IExtensionContribution');
//# sourceMappingURL=ioc-extras.js.map
//# sourceMappingURL=ioc-extras.js.map
