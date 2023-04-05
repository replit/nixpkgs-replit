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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allConfigurationProviders = exports.allConfigurationResolvers = void 0;
__exportStar(require("./configurationProvider"), exports);
const chromeDebugConfigurationProvider_1 = require("./chromeDebugConfigurationProvider");
const edgeDebugConfigurationProvider_1 = require("./edgeDebugConfigurationProvider");
const extensionHostConfigurationResolver_1 = require("./extensionHostConfigurationResolver");
const nodeDebugConfigurationProvider_1 = require("./nodeDebugConfigurationProvider");
const nodeDebugConfigurationResolver_1 = require("./nodeDebugConfigurationResolver");
const terminalDebugConfigurationResolver_1 = require("./terminalDebugConfigurationResolver");
exports.allConfigurationResolvers = [
    chromeDebugConfigurationProvider_1.ChromeDebugConfigurationResolver,
    edgeDebugConfigurationProvider_1.EdgeDebugConfigurationResolver,
    extensionHostConfigurationResolver_1.ExtensionHostConfigurationResolver,
    nodeDebugConfigurationResolver_1.NodeConfigurationResolver,
    terminalDebugConfigurationResolver_1.TerminalDebugConfigurationResolver,
];
exports.allConfigurationProviders = [
    chromeDebugConfigurationProvider_1.ChromeDebugConfigurationProvider,
    edgeDebugConfigurationProvider_1.EdgeDebugConfigurationProvider,
    nodeDebugConfigurationProvider_1.NodeInitialDebugConfigurationProvider,
    nodeDebugConfigurationProvider_1.NodeDynamicDebugConfigurationProvider,
];
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
