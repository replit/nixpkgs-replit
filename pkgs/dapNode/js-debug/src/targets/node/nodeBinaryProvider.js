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
exports.InteractiveNodeBinaryProvider = exports.NodeBinaryProvider = exports.NodeBinaryOutOfDateError = exports.NodeBinary = exports.getRunScript = exports.isPackageManager = exports.hideDebugInfoFromConsole = exports.INodeBinaryProvider = void 0;
const inversify_1 = require("inversify");
const path_1 = require("path");
const nls = __importStar(require("vscode-nls"));
const environmentVars_1 = require("../../common/environmentVars");
const logging_1 = require("../../common/logging");
const pathUtils_1 = require("../../common/pathUtils");
const processUtils_1 = require("../../common/processUtils");
const semver_1 = require("../../common/semver");
const errors_1 = require("../../dap/errors");
const protocolError_1 = require("../../dap/protocolError");
const ioc_extras_1 = require("../../ioc-extras");
const packageJsonProvider_1 = require("./packageJsonProvider");
const localize = nls.loadMessageBundle();
exports.INodeBinaryProvider = Symbol('INodeBinaryProvider');
/**
 * If the Node binary supports it, adds an option to the NODE_OPTIONS that
 * prevents spewing extra debug info to the console.
 * @see https://github.com/microsoft/vscode-js-debug/issues/558
 */
function hideDebugInfoFromConsole(binary, env) {
    return binary.has(1 /* UseInspectPublishUid */)
        ? env.addNodeOption('--inspect-publish-uid=http')
        : env;
}
exports.hideDebugInfoFromConsole = hideDebugInfoFromConsole;
const packageManagers = new Set(['npm', 'yarn', 'pnpm', 'tnpm', 'cnpm']);
exports.isPackageManager = (exe) => packageManagers.has(path_1.basename(exe, path_1.extname(exe)));
/**
 * Detects an "npm run"-style invokation, and if found gets the script that the
 * user intends to run.
 */
exports.getRunScript = (runtimeExecutable, runtimeArgs) => {
    if (!runtimeExecutable || !exports.isPackageManager(runtimeExecutable)) {
        return;
    }
    return runtimeArgs.find(a => !a.startsWith('-') && a !== 'run' && a !== 'run-script');
};
const assumedVersion = new semver_1.Semver(12, 0, 0);
const minimumVersion = new semver_1.Semver(8, 0, 0);
/**
 * DTO returned from the NodeBinaryProvider.
 */
class NodeBinary {
    constructor(path, version) {
        this.path = path;
        this.version = version;
        this.capabilities = new Set();
        if (version === undefined) {
            version = assumedVersion;
        }
        if (version.gte(new semver_1.Semver(12, 0, 0))) {
            this.capabilities.add(0 /* UseSpacesInRequirePath */);
        }
        if (version.gte(new semver_1.Semver(12, 6, 0))) {
            this.capabilities.add(1 /* UseInspectPublishUid */);
        }
    }
    /**
     * Gets whether this version was detected exactly, or just assumed.
     */
    get isPreciselyKnown() {
        return this.version !== undefined;
    }
    /**
     * Gets whether the Node program has the capability. If `defaultIfImprecise`
     * is passed and the Node Binary's version is not exactly know, that default
     * will be returned instead.
     */
    has(capability, defaultIfImprecise) {
        if (!this.isPreciselyKnown && defaultIfImprecise !== undefined) {
            return defaultIfImprecise;
        }
        return this.capabilities.has(capability);
    }
}
exports.NodeBinary = NodeBinary;
class NodeBinaryOutOfDateError extends protocolError_1.ProtocolError {
    constructor(version, location) {
        super(errors_1.nodeBinaryOutOfDate(version.toString(), location));
        this.version = version;
        this.location = location;
    }
}
exports.NodeBinaryOutOfDateError = NodeBinaryOutOfDateError;
const exeRe = /^(node|electron)(64)?(\.exe|\.cmd)?$/i;
/**
 * Mapping of electron versions to *effective* node versions. This is not
 * as simple as it looks. Electron bundles their own Node version, but that
 * Node version is not actually the same as the released version. For example
 * Electron 5 is Node 12 but doesn't contain the NODE_OPTIONS parsing fixes
 * that Node 12.0.0 does.
 *
 * todo: we should move to individual feature flags if/when we need additional
 * functionality here.
 */
const electronNodeVersion = new Map([
    [11, new semver_1.Semver(12, 0, 0)],
    [10, new semver_1.Semver(12, 0, 0)],
    [9, new semver_1.Semver(12, 0, 0)],
    [8, new semver_1.Semver(12, 0, 0)],
    [7, new semver_1.Semver(12, 0, 0)],
    [6, new semver_1.Semver(12, 0, 0)],
    [5, new semver_1.Semver(10, 0, 0)],
    [4, new semver_1.Semver(10, 0, 0)],
    [3, new semver_1.Semver(10, 0, 0)],
    [2, new semver_1.Semver(8, 0, 0)],
    [1, new semver_1.Semver(8, 0, 0)],
]);
/**
 * Utility that resolves a path to Node.js and validates
 * it's a debuggable version./
 */
let NodeBinaryProvider = class NodeBinaryProvider {
    constructor(logger, fs, packageJson) {
        this.logger = logger;
        this.fs = fs;
        this.packageJson = packageJson;
        /**
         * A set of binary paths we know are good and which can skip additional
         * validation. We don't store bad mappings, because a user might reinstall
         * or upgrade node in-place after we tell them it's outdated.
         */
        this.knownGoodMappings = new Map();
    }
    /**
     * Validates the path and returns an absolute path to the Node binary to run.
     */
    async resolveAndValidate(env, executable = 'node', explicitVersion) {
        try {
            return await this.resolveAndValidateInner(env, executable, explicitVersion);
        }
        catch (e) {
            if (!(e instanceof NodeBinaryOutOfDateError)) {
                throw e;
            }
            if (await this.shouldTryDebuggingAnyway(e)) {
                return new NodeBinary(e.location, e.version instanceof semver_1.Semver ? e.version : undefined);
            }
            throw e;
        }
    }
    /**
     * Gets whether we should continue to try to debug even if we saw an outdated
     * Node.js version.
     */
    shouldTryDebuggingAnyway(_outatedReason) {
        return Promise.resolve(false);
    }
    async resolveAndValidateInner(env, executable, explicitVersion) {
        var _a, _b;
        const location = await this.resolveBinaryLocation(executable, env);
        this.logger.info("runtime.launch" /* RuntimeLaunch */, 'Using binary at', { location, executable });
        if (!location) {
            throw new protocolError_1.ProtocolError(errors_1.cannotFindNodeBinary(executable, localize('runtime.node.notfound.enoent', 'path does not exist')));
        }
        if (explicitVersion) {
            return new NodeBinary(location, new semver_1.Semver(explicitVersion, 0, 0));
        }
        // If the runtime executable doesn't look like Node.js (could be a shell
        // script that boots Node by itself, for instance) try to find Node itself
        // on the path as a fallback.
        const exeInfo = exeRe.exec(path_1.basename(location).toLowerCase());
        if (!exeInfo) {
            if (exports.isPackageManager(location)) {
                const packageJson = await this.packageJson.getPath();
                if (packageJson) {
                    env = env.addToPath(path_1.resolve(path_1.dirname(packageJson), 'node_modules/.bin'), 'prepend');
                }
            }
            try {
                const realBinary = await this.resolveAndValidateInner(env, 'node', undefined);
                return new NodeBinary(location, realBinary.version);
            }
            catch (e) {
                // if we verified it's outdated, still throw the error. If it's not
                // found, at least try to run it since the package manager exists.
                if (errors_1.isErrorOfType(e, 9230 /* NodeBinaryOutOfDate */)) {
                    throw e;
                }
                return new NodeBinary(location, undefined);
            }
        }
        // Seems like we can't get stdout from Node installed in snap, see:
        // https://github.com/microsoft/vscode/issues/102355#issuecomment-657707702
        if (location.startsWith('/snap/')) {
            return new NodeBinary(location, undefined);
        }
        const knownGood = this.knownGoodMappings.get(location);
        if (knownGood) {
            return knownGood;
        }
        // match the "12" in "v12.34.56"
        const versionText = await this.getVersionText(location);
        this.logger.info("runtime.launch" /* RuntimeLaunch */, 'Discovered version', { version: versionText.trim() });
        const majorVersionMatch = /v([0-9]+)\.([0-9]+)\.([0-9]+)/.exec(versionText);
        if (!majorVersionMatch) {
            throw new NodeBinaryOutOfDateError(versionText.trim(), location);
        }
        const [, major, minor, patch] = majorVersionMatch.map(Number);
        let version = new semver_1.Semver(major, minor, patch);
        // remap the node version bundled if we're running electron
        if (exeInfo[1] === 'electron') {
            const nodeVersion = await this.resolveAndValidate(env);
            version = semver_1.Semver.min((_a = electronNodeVersion.get(version.major)) !== null && _a !== void 0 ? _a : assumedVersion, (_b = nodeVersion.version) !== null && _b !== void 0 ? _b : assumedVersion);
        }
        if (version.lt(minimumVersion)) {
            throw new NodeBinaryOutOfDateError(version, location);
        }
        const entry = new NodeBinary(location, version);
        this.knownGoodMappings.set(location, entry);
        return entry;
    }
    async resolveBinaryLocation(executable, env) {
        return executable && path_1.isAbsolute(executable)
            ? await pathUtils_1.findExecutable(this.fs, executable, env)
            : await pathUtils_1.findInPath(this.fs, executable, env.value);
    }
    async getVersionText(binary) {
        try {
            const { stdout } = await processUtils_1.spawnAsync(binary, ['--version'], {
                env: environmentVars_1.EnvironmentVars.processEnv().defined(),
            });
            return stdout;
        }
        catch (e) {
            throw new protocolError_1.ProtocolError(errors_1.cannotFindNodeBinary(binary, localize('runtime.node.notfound.spawnErr', 'error getting version: {0}', e.message)));
        }
    }
};
NodeBinaryProvider = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(logging_1.ILogger)),
    __param(1, inversify_1.inject(ioc_extras_1.FS)),
    __param(2, inversify_1.inject(packageJsonProvider_1.IPackageJsonProvider))
], NodeBinaryProvider);
exports.NodeBinaryProvider = NodeBinaryProvider;
let InteractiveNodeBinaryProvider = class InteractiveNodeBinaryProvider extends NodeBinaryProvider {
    constructor(logger, fs, packageJson, vscode) {
        super(logger, fs, packageJson);
        this.vscode = vscode;
    }
    /**
     * @override
     */
    async shouldTryDebuggingAnyway({ message }) {
        if (!this.vscode) {
            return false;
        }
        const yes = localize('yes', 'Yes');
        const response = await this.vscode.window.showErrorMessage(localize('outOfDate', '{0} Would you like to try debugging anyway?', message), yes);
        return response === yes;
    }
};
InteractiveNodeBinaryProvider = __decorate([
    __param(0, inversify_1.inject(logging_1.ILogger)),
    __param(1, inversify_1.inject(ioc_extras_1.FS)),
    __param(2, inversify_1.inject(packageJsonProvider_1.IPackageJsonProvider)),
    __param(3, inversify_1.optional()), __param(3, inversify_1.inject(ioc_extras_1.VSCodeApi))
], InteractiveNodeBinaryProvider);
exports.InteractiveNodeBinaryProvider = InteractiveNodeBinaryProvider;
//# sourceMappingURL=nodeBinaryProvider.js.map
//# sourceMappingURL=nodeBinaryProvider.js.map
