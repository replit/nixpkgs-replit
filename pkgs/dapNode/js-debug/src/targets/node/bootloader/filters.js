"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAll = exports.checkIsNotNodeGyp = exports.checkNotNpmPrefixCheckOnWindows = exports.checkProcessFilter = exports.checkNotElectron = exports.checkLeaseFile = exports.checkIsDebugMode = void 0;
const path_1 = require("path");
const lease_file_1 = require("../lease-file");
const logger_1 = require("./logger");
exports.checkIsDebugMode = (env) => {
    if (!env || !env.inspectorIpc) {
        logger_1.bootloaderLogger.info("runtime.launch" /* RuntimeLaunch */, 'Disabling due to lack of IPC server');
        return false;
    }
    return true;
};
exports.checkLeaseFile = (env) => {
    const leaseFile = env.requireLease;
    if (leaseFile && !lease_file_1.LeaseFile.isValid(leaseFile)) {
        logger_1.bootloaderLogger.info("runtime.launch" /* RuntimeLaunch */, 'Disabling due to invalid lease file');
        return false;
    }
    return true;
};
// Do not enable for Electron and other hybrid environments.
exports.checkNotElectron = () => {
    try {
        eval('window');
        logger_1.bootloaderLogger.info("runtime.launch" /* RuntimeLaunch */, 'Disabling in Electron (window is set)');
        return false;
    }
    catch (e) {
        return true;
    }
};
exports.checkProcessFilter = (env) => {
    let scriptName = '';
    try {
        scriptName = require.resolve(process.argv[1]);
    }
    catch (e) {
        scriptName = process.argv[1];
    }
    let waitForDebugger;
    try {
        waitForDebugger = new RegExp(env.waitForDebugger || '').test(scriptName);
    }
    catch (e) {
        waitForDebugger = true;
    }
    if (!waitForDebugger) {
        logger_1.bootloaderLogger.info("runtime.launch" /* RuntimeLaunch */, 'Disabling due to not matching pattern', {
            pattern: env.waitForDebugger,
            scriptName,
        });
    }
    return waitForDebugger;
};
/**
 * npm.cmd on windows *can* run `node C:/.../npm-cli.js prefix -g` before
 * running the script. In the integrated terminal, this can steal the debug
 * session and cause us to think it's over before it actually is.
 * @see https://github.com/microsoft/vscode-js-debug/issues/645
 */
exports.checkNotNpmPrefixCheckOnWindows = () => {
    const argv = process.argv;
    return !(argv.length === 4 &&
        path_1.basename(argv[1]) === 'npm-cli.js' &&
        argv[2] === 'prefix' &&
        argv[3] === '-g');
};
/**
 * Disable attaching to the node-gyp tree, otherwise some checks it does fails
 * since Node writes debugger information to stderr.
 * @see https://github.com/nodejs/node-gyp/blob/c3c510d89ede3a747eb679a49254052344ed8bc3/gyp/pylib/gyp/input.py#L982-L989
 * @see https://github.com/microsoft/vscode/issues/117312
 */
exports.checkIsNotNodeGyp = (env) => {
    if (!!env.deferredMode &&
        process.argv.length >= 2 &&
        path_1.basename(process.argv[1]) === 'node-gyp.js') {
        return false;
    }
    return true;
};
const allChecks = [
    exports.checkIsNotNodeGyp,
    exports.checkIsDebugMode,
    exports.checkLeaseFile,
    exports.checkNotElectron,
    exports.checkProcessFilter,
    exports.checkNotNpmPrefixCheckOnWindows,
];
/**
 * Checks that we're able to debug this process.
 */
exports.checkAll = (env) => !!env && !allChecks.some(fn => !fn(env));
//# sourceMappingURL=filters.js.map
//# sourceMappingURL=filters.js.map
