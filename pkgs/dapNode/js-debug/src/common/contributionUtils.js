"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeConfig = exports.readConfig = exports.asCommand = exports.runCommand = exports.registerCommand = exports.isDebugType = exports.allDebugTypes = exports.allCommands = void 0;
// constructing it this way makes sure we can't forget to add a type:
const debugTypes = {
    ["pwa-extensionHost" /* ExtensionHost */]: null,
    ["node-terminal" /* Terminal */]: null,
    ["pwa-node" /* Node */]: null,
    ["pwa-chrome" /* Chrome */]: null,
    ["pwa-msedge" /* Edge */]: null,
};
const commandsObj = {
    ["extension.js-debug.addCustomBreakpoints" /* AddCustomBreakpoints */]: null,
    ["extension.pwa-node-debug.attachNodeProcess" /* AttachProcess */]: null,
    ["extension.js-debug.clearAutoAttachVariables" /* AutoAttachClearVariables */]: null,
    ["extension.js-debug.setAutoAttachVariables" /* AutoAttachSetVariables */]: null,
    ["extension.js-debug.autoAttachToProcess" /* AutoAttachToProcess */]: null,
    ["extension.js-debug.createDebuggerTerminal" /* CreateDebuggerTerminal */]: null,
    ["extension.js-debug.createDiagnostics" /* CreateDiagnostics */]: null,
    ["extension.js-debug.debugLink" /* DebugLink */]: null,
    ["extension.js-debug.npmScript" /* DebugNpmScript */]: null,
    ["extension.js-debug.pickNodeProcess" /* PickProcess */]: null,
    ["extension.js-debug.prettyPrint" /* PrettyPrint */]: null,
    ["extension.js-debug.removeAllCustomBreakpoints" /* RemoveAllCustomBreakpoints */]: null,
    ["extension.js-debug.removeCustomBreakpoint" /* RemoveCustomBreakpoint */]: null,
    ["extension.js-debug.revealPage" /* RevealPage */]: null,
    ["extension.js-debug.startProfile" /* StartProfile */]: null,
    ["extension.js-debug.stopProfile" /* StopProfile */]: null,
    ["extension.js-debug.toggleSkippingFile" /* ToggleSkipping */]: null,
    ["extension.node-debug.startWithStopOnEntry" /* StartWithStopOnEntry */]: null,
    ["extension.js-debug.requestCDPProxy" /* RequestCDPProxy */]: null,
    ["extension.js-debug.openEdgeDevTools" /* OpenEdgeDevTools */]: null,
};
/**
 * Set of all known commands.
 */
exports.allCommands = new Set(Object.keys(commandsObj));
/**
 * Set of all known debug types.
 */
exports.allDebugTypes = new Set(Object.keys(debugTypes));
/**
 * Gets whether the given debug type is one of the js-debug-handled debug types.
 */
exports.isDebugType = (debugType) => exports.allDebugTypes.has(debugType);
/**
 * Typed guard for registering a command.
 */
exports.registerCommand = (ns, key, fn) => ns.registerCommand(key, fn);
/**
 * Typed guard for running a command.
 */
exports.runCommand = async (ns, key, ...args) => (await ns.executeCommand(key, ...args));
/**
 * Typed guard for creating a {@link Command} interface.
 */
exports.asCommand = (command) => command;
/**
 * Typed guard for reading a contributed config.
 */
exports.readConfig = (wsp, key, folder) => wsp.getConfiguration(undefined, folder).get(key);
/**
 * Typed guard for updating a contributed config.
 */
exports.writeConfig = (wsp, key, value, target) => wsp.getConfiguration().update(key, value, target);
//# sourceMappingURL=contributionUtils.js.map
//# sourceMappingURL=contributionUtils.js.map
