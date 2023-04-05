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
exports.isErrorOfType = exports.isDapError = exports.sourceMapParseFailed = exports.invalidBreakPointCondition = exports.asyncScopesNotAvailable = exports.invalidLogPointSyntax = exports.targetPageNotFound = exports.browserAttachFailed = exports.browserLaunchFailed = exports.browserNotFound = exports.replError = exports.invalidConcurrentProfile = exports.profileCaptureError = exports.invalidHitCondition = exports.nodeBinaryOutOfDate = exports.cannotFindNodeBinary = exports.cannotLoadEnvironmentVars = exports.cannotLaunchInTerminal = exports.nvmVersionNotFound = exports.nvmHomeNotFound = exports.nvsNotFound = exports.nvmNotFound = exports.createUserError = exports.createSilentError = exports.reportToConsole = void 0;
const nls = __importStar(require("vscode-nls"));
const protocolError_1 = require("./protocolError");
const localize = nls.loadMessageBundle();
function reportToConsole(dap, error) {
    dap.output({
        category: 'console',
        output: error + '\n',
    });
}
exports.reportToConsole = reportToConsole;
function createSilentError(text, code = 9222 /* SilentError */) {
    return {
        __errorMarker: true,
        error: {
            id: code,
            format: text,
            showUser: false,
        },
    };
}
exports.createSilentError = createSilentError;
function createUserError(text, code = 9223 /* UserError */) {
    return {
        __errorMarker: true,
        error: {
            id: code,
            format: text,
            showUser: true,
        },
    };
}
exports.createUserError = createUserError;
exports.nvmNotFound = () => createUserError(localize('NVS_HOME.not.found.message', "Attribute 'runtimeVersion' requires Node.js version manager 'nvs' or 'nvm' to be installed."), 9224 /* NvmOrNvsNotFound */);
exports.nvsNotFound = () => createUserError(localize('NVS_HOME.not.found.message', "Attribute 'runtimeVersion' with a flavor/architecture requires 'nvs' to be installed."), 9225 /* NvsNotFound */);
exports.nvmHomeNotFound = () => createUserError(localize('NVM_HOME.not.found.message', "Attribute 'runtimeVersion' requires Node.js version manager 'nvm-windows' or 'nvs'."), 9226 /* NvmHomeNotFound */);
exports.nvmVersionNotFound = (version, versionManager) => createUserError(localize('runtime.version.not.found.message', "Node.js version '{0}' not installed using version manager {1}.", version, versionManager), 9226 /* NvmHomeNotFound */);
exports.cannotLaunchInTerminal = (errorMessage) => createUserError(localize('VSND2011', 'Cannot launch debug target in terminal ({0}).', errorMessage), 9227 /* CannotLaunchInTerminal */);
exports.cannotLoadEnvironmentVars = (errorMessage) => createUserError(localize('VSND2029', "Can't load environment variables from file ({0}).", errorMessage), 9228 /* CannotLoadEnvironmentVariables */);
exports.cannotFindNodeBinary = (attemptedPath, reason) => createUserError(localize('runtime.node.notfound', 'Can\'t find Node.js binary "{0}": {1}. Make sure Node.js is installed and in your PATH, or set the "runtimeExecutable" in your launch.json', attemptedPath, reason), 9229 /* CannotFindNodeBinary */);
exports.nodeBinaryOutOfDate = (readVersion, attemptedPath) => createUserError(localize('runtime.node.outdated', 'The Node version in "{0}" is outdated (version {1}), we require at least Node 8.x.', attemptedPath, readVersion), 9230 /* NodeBinaryOutOfDate */);
exports.invalidHitCondition = (expression) => createUserError(localize('invalidHitCondition', 'Invalid hit condition "{0}". Expected an expression like "> 42" or "== 2".', expression), 9231 /* InvalidHitCondition */);
exports.profileCaptureError = () => createUserError(localize('profile.error.generic', 'An error occurred taking a profile from the target.'), 9235 /* ProfileCaptureError */);
exports.invalidConcurrentProfile = () => createUserError(localize('profile.error.concurrent', 'Please stop the running profile before starting a new one.'), 9236 /* InvalidConcurrentProfile */);
exports.replError = (message) => createSilentError(message, 9238 /* ReplError */);
exports.browserNotFound = (browserType, requested, available) => createUserError(requested === 'stable' && !available.length
    ? localize('noBrowserInstallFound', 'Unable to find a {0} installation on your system. Try installing it, or providing an absolute path to the browser in the "runtimeExecutable" in your launch.json.', browserType)
    : localize('browserVersionNotFound', 'Unable to find {0} version {1}. Available auto-discovered versions are: {2}. You can set the "runtimeExecutable" in your launch.json to one of these, or provide an absolute path to the browser executable.', browserType, requested, JSON.stringify([...new Set(available)])), 9233 /* BrowserNotFound */);
exports.browserLaunchFailed = (innerError) => createUserError(localize('error.browserLaunchError', 'Unable to launch browser: "{0}"', innerError.message), 9240 /* BrowserLaunchFailed */);
exports.browserAttachFailed = (message) => createUserError(message !== null && message !== void 0 ? message : localize('error.browserAttachError', 'Unable to attach to browser'), 9242 /* BrowserAttachFailed */);
exports.targetPageNotFound = () => createUserError(localize('error.threadNotFound', 'Target page not found. You may need to update your "urlFilter" to match the page you want to debug.'), 9241 /* TargetPageNotFound */);
exports.invalidLogPointSyntax = (error) => createUserError(error, 9232 /* InvalidLogPointBreakpointSyntax */);
exports.asyncScopesNotAvailable = () => createSilentError(localize('asyncScopesNotAvailable', 'Variables not available in async stacks'), 9234 /* AsyncScopesNotAvailable */);
exports.invalidBreakPointCondition = (params, error) => createUserError(localize('breakpointSyntaxError', 'Syntax error setting breakpoint with condition {0} on line {1}: {2}', JSON.stringify(params.condition), params.line, error), 9237 /* InvalidBreakpointCondition */);
// use the compiledUrl instead of the source map url here, since the source
// map could be a very large data URI
exports.sourceMapParseFailed = (compiledUrl, message) => createUserError(localize('sourcemapParseError', 'Could not read source map for {0}: {1}', compiledUrl, message));
/**
 * Returns if the value looks like a DAP error.
 */
exports.isDapError = (value) => typeof value === 'object' && !!value && '__errorMarker' in value;
exports.isErrorOfType = (error, code) => error instanceof protocolError_1.ProtocolError && error.cause.id === code;
//# sourceMappingURL=errors.js.map
//# sourceMappingURL=errors.js.map
