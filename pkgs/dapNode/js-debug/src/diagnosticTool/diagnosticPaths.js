"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixDriveLetter = exports.forceForwardSlashes = exports.properRelative = exports.isAbsoluteWin32 = exports.isAbsolutePosix = exports.properAbsolute = exports.basename = exports.prettyName = exports.sortScore = exports.isBrowserType = exports.isNodeType = void 0;
const path_1 = require("path");
const nodeInternalMarker = '<node_internals>';
exports.isNodeType = (dump) => dump.config.type === "pwa-node" /* Node */ ||
    dump.config.type === "pwa-extensionHost" /* ExtensionHost */ ||
    dump.config.type === "node-terminal" /* Terminal */;
exports.isBrowserType = (dump) => dump.config.type === "pwa-chrome" /* Chrome */ || dump.config.type === "pwa-msedge" /* Edge */;
exports.sortScore = (source) => {
    if (source.absolutePath.startsWith(nodeInternalMarker)) {
        return 2;
    }
    if (source.absolutePath.includes('node_moeules')) {
        return 1;
    }
    return 0;
};
exports.prettyName = (source, dump) => {
    if (source.absolutePath.startsWith(nodeInternalMarker)) {
        return source.absolutePath;
    }
    if (exports.properAbsolute(source.absolutePath) && dump.config.__workspaceFolder) {
        return exports.properRelative(dump.config.__workspaceFolder, source.absolutePath);
    }
    return source.absolutePath || source.url;
};
exports.basename = (source) => {
    const parts = (source.prettyName || source.url).split(/\\|\//g);
    return parts[parts.length - 1];
};
// note: that path module webpack uses (path-browserify) doesn't implement win32
// path operations, so implement them by hand...
exports.properAbsolute = (testPath) => exports.isAbsolutePosix(testPath) || exports.isAbsoluteWin32(testPath);
exports.isAbsolutePosix = (path) => path.startsWith('/');
exports.isAbsoluteWin32 = (path) => /^[a-z]:/i.test(path);
exports.properRelative = (fromPath, toPath) => {
    if (exports.isAbsolutePosix(fromPath)) {
        return path_1.relative(fromPath, toPath);
    }
    else {
        return path_1.relative(exports.forceForwardSlashes(exports.fixDriveLetter(fromPath)), exports.forceForwardSlashes(exports.fixDriveLetter(toPath)));
    }
};
exports.forceForwardSlashes = (aUrl) => aUrl.replace(/\\\//g, '/').replace(/\\/g, '/');
exports.fixDriveLetter = (path) => path.slice(0, 1).toUpperCase() + path.slice(1);
//# sourceMappingURL=diagnosticPaths.js.map
//# sourceMappingURL=diagnosticPaths.js.map
