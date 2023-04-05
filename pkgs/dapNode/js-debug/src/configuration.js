"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extensionId = exports.isNightly = exports.packagePublisher = exports.packageVersion = exports.packageName = exports.breakpointLanguages = exports.resolveVariableInConfig = exports.resolveWorkspaceInConfig = exports.removeOptionalWorkspaceFolderUsages = exports.applyDefaults = exports.isConfigurationWithEnv = exports.applyTerminalDefaults = exports.applyExtensionHostDefaults = exports.applyEdgeDefaults = exports.applyChromeDefaults = exports.applyNodeDefaults = exports.defaultSourceMapPathOverrides = exports.nodeAttachConfigDefaults = exports.edgeLaunchConfigDefaults = exports.chromeLaunchConfigDefaults = exports.edgeAttachConfigDefaults = exports.chromeAttachConfigDefaults = exports.nodeLaunchConfigDefaults = exports.extensionHostConfigDefaults = exports.delegateDefaults = exports.terminalBaseDefaults = exports.baseDefaults = exports.AnyLaunchConfiguration = void 0;
const package_json_1 = __importDefault(require("../package.json"));
const objUtils_1 = require("./common/objUtils");
exports.AnyLaunchConfiguration = Symbol('AnyLaunchConfiguration');
exports.baseDefaults = {
    type: '',
    name: '',
    request: '',
    trace: false,
    outputCapture: "console" /* Console */,
    timeout: 10000,
    timeouts: {},
    showAsyncStacks: true,
    skipFiles: [],
    smartStep: true,
    sourceMaps: true,
    pauseForSourceMap: true,
    resolveSourceMapLocations: null,
    rootPath: '${workspaceFolder}',
    outFiles: ['${workspaceFolder}/**/*.js', '!**/node_modules/**'],
    sourceMapPathOverrides: defaultSourceMapPathOverrides('${workspaceFolder}'),
    enableContentValidation: true,
    cascadeTerminateToConfigurations: [],
    // Should always be determined upstream;
    __workspaceFolder: '',
    __autoExpandGetters: false,
    __remoteFilePrefix: undefined,
    __breakOnConditionalError: false,
    customDescriptionGenerator: undefined,
    customPropertiesGenerator: undefined,
};
const nodeBaseDefaults = Object.assign(Object.assign({}, exports.baseDefaults), { cwd: '${workspaceFolder}', env: {}, envFile: null, pauseForSourceMap: false, sourceMaps: true, localRoot: null, remoteRoot: null, resolveSourceMapLocations: ['**', '!**/node_modules/**'], autoAttachChildProcesses: true, runtimeSourcemapPausePatterns: [] });
exports.terminalBaseDefaults = Object.assign(Object.assign({}, nodeBaseDefaults), { showAsyncStacks: { onceBreakpointResolved: 16 }, type: "node-terminal" /* Terminal */, request: 'launch', name: 'JavaScript Debug Terminal' });
exports.delegateDefaults = Object.assign(Object.assign({}, nodeBaseDefaults), { type: "node-terminal" /* Terminal */, request: 'attach', name: exports.terminalBaseDefaults.name, showAsyncStacks: { onceBreakpointResolved: 16 }, delegateId: -1 });
exports.extensionHostConfigDefaults = Object.assign(Object.assign({}, nodeBaseDefaults), { type: "pwa-extensionHost" /* ExtensionHost */, name: 'Debug Extension', request: 'launch', args: ['--extensionDevelopmentPath=${workspaceFolder}'], outFiles: ['${workspaceFolder}/out/**/*.js'], resolveSourceMapLocations: ['${workspaceFolder}/**', '!**/node_modules/**'], rendererDebugOptions: {}, runtimeExecutable: '${execPath}', autoAttachChildProcesses: false, debugWebviews: false, debugWebWorkerHost: false, __sessionId: '' });
exports.nodeLaunchConfigDefaults = Object.assign(Object.assign({}, nodeBaseDefaults), { type: "pwa-node" /* Node */, request: 'launch', program: '', cwd: '${workspaceFolder}', stopOnEntry: false, console: 'internalConsole', restart: false, args: [], runtimeExecutable: 'node', runtimeVersion: 'default', runtimeArgs: [], profileStartup: false, attachSimplePort: null, killBehavior: "forceful" /* Forceful */ });
exports.chromeAttachConfigDefaults = Object.assign(Object.assign({}, exports.baseDefaults), { type: "pwa-chrome" /* Chrome */, request: 'attach', address: 'localhost', port: 0, disableNetworkCache: true, pathMapping: {}, url: null, restart: false, urlFilter: '', sourceMapPathOverrides: defaultSourceMapPathOverrides('${webRoot}'), webRoot: '${workspaceFolder}', server: null, browserAttachLocation: 'workspace', targetSelection: 'automatic', vueComponentPaths: ['${workspaceFolder}/**/*.vue', '!**/node_modules/**'], perScriptSourcemaps: 'auto' });
exports.edgeAttachConfigDefaults = Object.assign(Object.assign({}, exports.chromeAttachConfigDefaults), { type: "pwa-msedge" /* Edge */, useWebView: false });
exports.chromeLaunchConfigDefaults = Object.assign(Object.assign({}, exports.chromeAttachConfigDefaults), { type: "pwa-chrome" /* Chrome */, request: 'launch', cwd: null, file: null, env: {}, urlFilter: '*', includeDefaultArgs: true, runtimeArgs: null, runtimeExecutable: 'stable', userDataDir: true, browserLaunchLocation: 'workspace', profileStartup: false, cleanUp: 'wholeBrowser' });
exports.edgeLaunchConfigDefaults = Object.assign(Object.assign({}, exports.chromeLaunchConfigDefaults), { type: "pwa-msedge" /* Edge */, useWebView: false });
exports.nodeAttachConfigDefaults = Object.assign(Object.assign({}, nodeBaseDefaults), { type: "pwa-node" /* Node */, attachExistingChildren: true, address: 'localhost', port: 9229, restart: false, request: 'attach', continueOnAttach: false });
function defaultSourceMapPathOverrides(webRoot) {
    return {
        'webpack:///./~/*': `${webRoot}/node_modules/*`,
        'webpack:////*': '/*',
        'webpack://?:*/*': `${webRoot}/*`,
        'webpack:///([a-z]):/(.+)': '$1:/$2',
        'meteor://💻app/*': `${webRoot}/*`,
    };
}
exports.defaultSourceMapPathOverrides = defaultSourceMapPathOverrides;
function applyNodeDefaults(_a) {
    var config = __rest(_a, []);
    if (!config.sourceMapPathOverrides && config.cwd) {
        config.sourceMapPathOverrides = defaultSourceMapPathOverrides(config.cwd);
    }
    // Resolve source map locations from the outFiles by default:
    // https://github.com/microsoft/vscode-js-debug/issues/704
    if (config.resolveSourceMapLocations === undefined && !config.remoteRoot) {
        config.resolveSourceMapLocations = config.outFiles;
    }
    if (config.request === 'attach') {
        return Object.assign(Object.assign({}, exports.nodeAttachConfigDefaults), config);
    }
    else {
        return Object.assign(Object.assign({}, exports.nodeLaunchConfigDefaults), config);
    }
}
exports.applyNodeDefaults = applyNodeDefaults;
function applyChromeDefaults(config, browserLocation) {
    return config.request === 'attach'
        ? Object.assign(Object.assign(Object.assign({}, exports.chromeAttachConfigDefaults), { browserAttachLocation: browserLocation }), config) : Object.assign(Object.assign(Object.assign({}, exports.chromeLaunchConfigDefaults), { browserLaunchLocation: browserLocation }), config);
}
exports.applyChromeDefaults = applyChromeDefaults;
function applyEdgeDefaults(config, browserLocation) {
    return config.request === 'attach'
        ? Object.assign(Object.assign(Object.assign({}, exports.edgeAttachConfigDefaults), { browserAttachLocation: browserLocation }), config) : Object.assign(Object.assign(Object.assign({}, exports.edgeLaunchConfigDefaults), { browserLaunchLocation: browserLocation }), config);
}
exports.applyEdgeDefaults = applyEdgeDefaults;
function applyExtensionHostDefaults(config) {
    const resolved = Object.assign(Object.assign({}, exports.extensionHostConfigDefaults), config);
    resolved.skipFiles = [...resolved.skipFiles, '**/node_modules.asar/**'];
    return resolved;
}
exports.applyExtensionHostDefaults = applyExtensionHostDefaults;
function applyTerminalDefaults(config) {
    return config.request === 'launch'
        ? Object.assign(Object.assign({}, exports.terminalBaseDefaults), config) : Object.assign(Object.assign({}, exports.delegateDefaults), config);
}
exports.applyTerminalDefaults = applyTerminalDefaults;
exports.isConfigurationWithEnv = (config) => typeof config === 'object' && !!config && 'env' in config && 'envFile' in config;
function applyDefaults(config, location) {
    let configWithDefaults;
    const defaultBrowserLocation = location === 'remote' ? 'ui' : 'workspace';
    switch (config.type) {
        case "pwa-node" /* Node */:
            configWithDefaults = applyNodeDefaults(config);
            break;
        case "pwa-msedge" /* Edge */:
            configWithDefaults = applyEdgeDefaults(config, defaultBrowserLocation);
            break;
        case "pwa-chrome" /* Chrome */:
            configWithDefaults = applyChromeDefaults(config, defaultBrowserLocation);
            break;
        case "pwa-extensionHost" /* ExtensionHost */:
            configWithDefaults = applyExtensionHostDefaults(config);
            break;
        case "node-terminal" /* Terminal */:
            configWithDefaults = applyTerminalDefaults(config);
            break;
        default:
            throw objUtils_1.assertNever(config, 'Unknown config: {value}');
    }
    return resolveWorkspaceInConfig(configWithDefaults);
}
exports.applyDefaults = applyDefaults;
/**
 * Removes optional properties from the config where ${workspaceFolder} is
 * used by default. This enables some limited types of debugging without
 * workspaces set.
 */
function removeOptionalWorkspaceFolderUsages(config) {
    var _a, _b, _c;
    const token = '${workspaceFolder}';
    const cast = Object.assign(Object.assign({}, config), { rootPath: undefined, outFiles: config.outFiles.filter(o => !o.includes(token)), sourceMapPathOverrides: objUtils_1.filterValues(config.sourceMapPathOverrides, (v) => !v.includes('${workspaceFolder}')) });
    if ('vueComponentPaths' in cast) {
        cast.vueComponentPaths = cast.vueComponentPaths.filter(o => !o.includes(token));
    }
    if ('resolveSourceMapLocations' in cast) {
        cast.resolveSourceMapLocations = (_b = (_a = cast.resolveSourceMapLocations) === null || _a === void 0 ? void 0 : _a.filter(o => !o.includes(token))) !== null && _b !== void 0 ? _b : null;
    }
    if ('cwd' in cast && ((_c = cast.cwd) === null || _c === void 0 ? void 0 : _c.includes(token))) {
        cast.cwd = undefined;
    }
    return cast;
}
exports.removeOptionalWorkspaceFolderUsages = removeOptionalWorkspaceFolderUsages;
function resolveWorkspaceInConfig(config) {
    if (!config.__workspaceFolder) {
        config = removeOptionalWorkspaceFolderUsages(config);
    }
    config = resolveVariableInConfig(config, 'workspaceFolder', config.__workspaceFolder);
    config = resolveVariableInConfig(config, 'webRoot', 'webRoot' in config ? config.webRoot : config.__workspaceFolder);
    return config;
}
exports.resolveWorkspaceInConfig = resolveWorkspaceInConfig;
function resolveVariableInConfig(config, varName, varValue) {
    let out;
    if (typeof config === 'string') {
        out = config.replace(new RegExp(`\\$\\{${varName}\\}`, 'g'), () => {
            if (!varValue) {
                throw new Error(`Unable to resolve \${${varName}} in configuration (${JSON.stringify(varName)})`);
            }
            return varValue;
        });
    }
    else if (config instanceof Array) {
        out = config.map(cfg => resolveVariableInConfig(cfg, varName, varValue));
    }
    else if (typeof config === 'object' && config) {
        const obj = {};
        for (const [key, value] of Object.entries(config)) {
            obj[resolveVariableInConfig(key, varName, varValue)] = resolveVariableInConfig(value, varName, varValue);
        }
        out = obj;
    }
    else {
        out = config;
    }
    return out;
}
exports.resolveVariableInConfig = resolveVariableInConfig;
exports.breakpointLanguages = [
    'javascript',
    'typescript',
    'typescriptreact',
    'javascriptreact',
    'fsharp',
    'html',
];
exports.packageName = package_json_1.default.name;
exports.packageVersion = package_json_1.default.version;
exports.packagePublisher = package_json_1.default.publisher;
exports.isNightly = exports.packageName.includes('nightly');
exports.extensionId = `${exports.packagePublisher}.${exports.packageName}`;
//# sourceMappingURL=configuration.js.map
//# sourceMappingURL=configuration.js.map
