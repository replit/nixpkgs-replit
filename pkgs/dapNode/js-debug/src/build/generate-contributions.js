"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.debuggers = void 0;
const contributionUtils_1 = require("../common/contributionUtils");
const knownTools_1 = require("../common/knownTools");
const objUtils_1 = require("../common/objUtils");
const configuration_1 = require("../configuration");
const appInsightsKey = 'AIF-d9b70cd4-b9f9-4d70-929b-a071c400b217';
const forSomeDebugTypes = (types, contextKey, andExpr) => [...types].map(d => `${contextKey} == ${d}` + (andExpr ? ` && ${andExpr}` : '')).join(' || ');
const forAnyDebugType = (contextKey, andExpr) => forSomeDebugTypes(contributionUtils_1.allDebugTypes, contextKey, andExpr);
const forBrowserDebugType = (contextKey, andExpr) => forSomeDebugTypes(["pwa-chrome" /* Chrome */, "pwa-msedge" /* Edge */], contextKey, andExpr);
const forNodeDebugType = (contextKey, andExpr) => forSomeDebugTypes(["pwa-node" /* Node */, "pwa-extensionHost" /* ExtensionHost */, 'node'], contextKey, andExpr);
// eslint-disable-next-line
const refString = (str) => `%${str}%`;
const commonLanguages = ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'];
const browserLanguages = [...commonLanguages, 'html', 'css', 'coffeescript', 'handlebars', 'vue'];
const baseConfigurationAttributes = {
    resolveSourceMapLocations: {
        type: ['array', 'null'],
        description: refString('node.resolveSourceMapLocations.description'),
        default: null,
        items: {
            type: 'string',
        },
    },
    outFiles: {
        type: ['array'],
        description: refString('outFiles.description'),
        default: configuration_1.baseDefaults.outFiles,
        items: {
            type: 'string',
        },
    },
    pauseForSourceMap: {
        type: 'boolean',
        markdownDescription: refString('node.pauseForSourceMap.description'),
        default: false,
    },
    showAsyncStacks: {
        description: refString('node.showAsyncStacks.description'),
        default: true,
        oneOf: [
            {
                type: 'boolean',
            },
            {
                type: 'object',
                required: ['onAttach'],
                properties: {
                    onAttach: {
                        type: 'number',
                        default: 32,
                    },
                },
            },
            {
                type: 'object',
                required: ['onceBreakpointResolved'],
                properties: {
                    onceBreakpointResolved: {
                        type: 'number',
                        default: 32,
                    },
                },
            },
        ],
    },
    skipFiles: {
        type: 'array',
        description: refString('browser.skipFiles.description'),
        default: ['<node_internals>/**'],
    },
    smartStep: {
        type: 'boolean',
        description: refString('smartStep.description'),
        default: true,
    },
    sourceMaps: {
        type: 'boolean',
        description: refString('browser.sourceMaps.description'),
        default: true,
    },
    sourceMapPathOverrides: {
        type: 'object',
        description: refString('node.sourceMapPathOverrides.description'),
        default: {
            'webpack://?:*/*': '${workspaceFolder}/*',
            'webpack:///./~/*': '${workspaceFolder}/node_modules/*',
            'meteor://💻app/*': '${workspaceFolder}/*',
        },
    },
    timeout: {
        type: 'number',
        description: refString('node.timeout.description'),
        default: 10000,
    },
    timeouts: {
        type: 'object',
        description: refString('timeouts.generalDescription'),
        default: {},
        properties: {
            sourceMapMinPause: {
                type: 'number',
                description: refString('timeouts.sourceMaps.sourceMapMinPause.description'),
                default: 1000,
            },
            sourceMapCumulativePause: {
                type: 'number',
                description: refString('timeouts.sourceMaps.sourceMapCumulativePause.description'),
                default: 1000,
            },
        },
        additionalProperties: false,
        markdownDescription: refString('timeouts.generalDescription.markdown'),
    },
    trace: {
        description: refString('trace.description'),
        default: true,
        oneOf: [
            {
                type: 'boolean',
                description: refString('trace.boolean.description'),
            },
            {
                type: 'object',
                additionalProperties: false,
                properties: {
                    console: {
                        type: 'boolean',
                        description: refString('trace.stdio.description'),
                    },
                    stdio: {
                        type: 'boolean',
                        description: refString('trace.console.description'),
                    },
                    level: {
                        enum: ['fatal', 'error', 'warn', 'info', 'verbose'],
                        description: refString('trace.level.description'),
                    },
                    logFile: {
                        type: ['string', 'null'],
                        description: refString('trace.logFile.description'),
                    },
                    tags: {
                        type: 'array',
                        description: refString('trace.tags.description'),
                        items: {
                            enum: ['cdp', 'dap', 'runtime'],
                        },
                    },
                },
            },
        ],
    },
    outputCapture: {
        enum: ["console" /* Console */, "std" /* Stdio */],
        markdownDescription: refString('node.launch.outputCapture.description'),
        default: "console" /* Console */,
    },
    enableContentValidation: {
        default: true,
        type: 'boolean',
        description: refString('enableContentValidation.description'),
    },
    customDescriptionGenerator: {
        type: 'string',
        default: undefined,
        description: refString('customDescriptionGenerator.description'),
    },
    customPropertiesGenerator: {
        type: 'string',
        default: undefined,
        deprecated: true,
        description: refString('customPropertiesGenerator.description'),
    },
    cascadeTerminateToConfigurations: {
        type: 'array',
        items: {
            type: 'string',
            uniqueItems: true,
        },
        default: [],
        description: refString('base.cascadeTerminateToConfigurations.label'),
    },
};
/**
 * Shared Node.js configuration.
 */
const nodeBaseConfigurationAttributes = Object.assign(Object.assign({}, baseConfigurationAttributes), { resolveSourceMapLocations: Object.assign(Object.assign({}, baseConfigurationAttributes.resolveSourceMapLocations), { default: ['${workspaceFolder}/**', '!**/node_modules/**'] }), cwd: {
        type: 'string',
        description: refString('node.launch.cwd.description'),
        default: '${workspaceFolder}',
        docDefault: 'localRoot || ${workspaceFolder}',
    }, localRoot: {
        type: ['string', 'null'],
        description: refString('node.localRoot.description'),
        default: null,
    }, remoteRoot: {
        type: ['string', 'null'],
        description: refString('node.remoteRoot.description'),
        default: null,
    }, autoAttachChildProcesses: {
        type: 'boolean',
        description: refString('node.launch.autoAttachChildProcesses.description'),
        default: true,
    }, env: {
        type: 'object',
        additionalProperties: {
            type: ['string', 'null'],
        },
        markdownDescription: refString('node.launch.env.description'),
        default: {},
    }, envFile: {
        type: 'string',
        description: refString('node.launch.envFile.description'),
        default: '${workspaceFolder}/.env',
    }, runtimeSourcemapPausePatterns: {
        type: 'array',
        items: {
            type: 'string',
        },
        markdownDescription: refString('node.launch.runtimeSourcemapPausePatterns'),
        default: [],
    }, nodeVersionHint: {
        type: 'number',
        minimum: 8,
        description: refString('node.versionHint.description'),
        default: 12,
    } });
/**
 * Node attach configuration.
 */
const nodeAttachConfig = {
    type: "pwa-node" /* Node */,
    request: 'attach',
    label: refString('node.label'),
    languages: commonLanguages,
    variables: {
        PickProcess: "extension.js-debug.pickNodeProcess" /* PickProcess */,
    },
    configurationSnippets: [
        {
            label: refString('node.snippet.attach.label'),
            description: refString('node.snippet.attach.description'),
            body: {
                type: "pwa-node" /* Node */,
                request: 'attach',
                name: '${1:Attach}',
                port: 9229,
                skipFiles: ['<node_internals>/**'],
            },
        },
        {
            label: refString('node.snippet.remoteattach.label'),
            description: refString('node.snippet.remoteattach.description'),
            body: {
                type: "pwa-node" /* Node */,
                request: 'attach',
                name: '${1:Attach to Remote}',
                address: '${2:TCP/IP address of process to be debugged}',
                port: 9229,
                localRoot: '^"\\${workspaceFolder}"',
                remoteRoot: '${3:Absolute path to the remote directory containing the program}',
                skipFiles: ['<node_internals>/**'],
            },
        },
        {
            label: refString('node.snippet.attachProcess.label'),
            description: refString('node.snippet.attachProcess.description'),
            body: {
                type: "pwa-node" /* Node */,
                request: 'attach',
                name: '${1:Attach by Process ID}',
                processId: '^"\\${command:PickProcess}"',
                skipFiles: ['<node_internals>/**'],
            },
        },
    ],
    configurationAttributes: Object.assign(Object.assign({}, nodeBaseConfigurationAttributes), { address: {
            type: 'string',
            description: refString('node.address.description'),
            default: 'localhost',
        }, port: {
            type: 'number',
            description: refString('node.port.description'),
            default: 9229,
        }, websocketAddress: {
            type: 'string',
            description: refString('node.websocket.address.description'),
            default: undefined,
        }, restart: {
            description: refString('node.attach.restart.description'),
            default: true,
            oneOf: [
                {
                    type: 'boolean',
                },
                {
                    type: 'object',
                    properties: {
                        delay: { type: 'number', minimum: 0, default: 1000 },
                        maxAttempts: { type: 'number', minimum: 0, default: 10 },
                    },
                },
            ],
        }, processId: {
            type: 'string',
            description: refString('node.attach.processId.description'),
            default: '${command:PickProcess}',
        }, attachExistingChildren: {
            type: 'boolean',
            description: refString('node.attach.attachExistingChildren.description'),
            default: false,
        }, continueOnAttach: {
            type: 'boolean',
            markdownDescription: refString('node.attach.continueOnAttach'),
            default: true,
        } }),
    defaults: configuration_1.nodeAttachConfigDefaults,
};
/**
 * Node attach configuration.
 */
const nodeLaunchConfig = {
    type: "pwa-node" /* Node */,
    request: 'launch',
    label: refString('node.label'),
    languages: commonLanguages,
    variables: {
        PickProcess: "extension.js-debug.pickNodeProcess" /* PickProcess */,
    },
    configurationSnippets: [
        {
            label: refString('node.snippet.launch.label'),
            description: refString('node.snippet.launch.description'),
            body: {
                type: "pwa-node" /* Node */,
                request: 'launch',
                name: '${2:Launch Program}',
                program: '^"\\${workspaceFolder}/${1:app.js}"',
                skipFiles: ['<node_internals>/**'],
            },
        },
        {
            label: refString('node.snippet.npm.label'),
            markdownDescription: refString('node.snippet.npm.description'),
            body: {
                type: "pwa-node" /* Node */,
                request: 'launch',
                name: '${1:Launch via NPM}',
                runtimeExecutable: 'npm',
                runtimeArgs: ['run-script', 'debug'],
                skipFiles: ['<node_internals>/**'],
            },
        },
        {
            label: refString('node.snippet.nodemon.label'),
            description: refString('node.snippet.nodemon.description'),
            body: {
                type: "pwa-node" /* Node */,
                request: 'launch',
                name: 'nodemon',
                runtimeExecutable: 'nodemon',
                program: '^"\\${workspaceFolder}/${1:app.js}"',
                restart: true,
                console: 'integratedTerminal',
                internalConsoleOptions: 'neverOpen',
                skipFiles: ['<node_internals>/**'],
            },
        },
        {
            label: refString('node.snippet.mocha.label'),
            description: refString('node.snippet.mocha.description'),
            body: {
                type: "pwa-node" /* Node */,
                request: 'launch',
                name: 'Mocha Tests',
                program: '^"\\${workspaceFolder}/node_modules/mocha/bin/_mocha"',
                args: ['-u', 'tdd', '--timeout', '999999', '--colors', '^"\\${workspaceFolder}/${1:test}"'],
                internalConsoleOptions: 'openOnSessionStart',
                skipFiles: ['<node_internals>/**'],
            },
        },
        {
            label: refString('node.snippet.yo.label'),
            markdownDescription: refString('node.snippet.yo.description'),
            body: {
                type: "pwa-node" /* Node */,
                request: 'launch',
                name: 'Yeoman ${1:generator}',
                program: '^"\\${workspaceFolder}/node_modules/yo/lib/cli.js"',
                args: ['${1:generator}'],
                console: 'integratedTerminal',
                internalConsoleOptions: 'neverOpen',
                skipFiles: ['<node_internals>/**'],
            },
        },
        {
            label: refString('node.snippet.gulp.label'),
            description: refString('node.snippet.gulp.description'),
            body: {
                type: "pwa-node" /* Node */,
                request: 'launch',
                name: 'Gulp ${1:task}',
                program: '^"\\${workspaceFolder}/node_modules/gulp/bin/gulp.js"',
                args: ['${1:task}'],
                skipFiles: ['<node_internals>/**'],
            },
        },
        {
            label: refString('node.snippet.electron.label'),
            description: refString('node.snippet.electron.description'),
            body: {
                type: "pwa-node" /* Node */,
                request: 'launch',
                name: 'Electron Main',
                runtimeExecutable: '^"\\${workspaceFolder}/node_modules/.bin/electron"',
                program: '^"\\${workspaceFolder}/main.js"',
                skipFiles: ['<node_internals>/**'],
            },
        },
    ],
    configurationAttributes: Object.assign(Object.assign({}, nodeBaseConfigurationAttributes), { cwd: {
            type: 'string',
            description: refString('node.launch.cwd.description'),
            default: '${workspaceFolder}',
        }, program: {
            type: 'string',
            description: refString('node.launch.program.description'),
            default: '',
        }, stopOnEntry: {
            type: ['boolean', 'string'],
            description: refString('node.stopOnEntry.description'),
            default: true,
        }, console: {
            type: 'string',
            enum: ['internalConsole', 'integratedTerminal', 'externalTerminal'],
            enumDescriptions: [
                refString('node.launch.console.internalConsole.description'),
                refString('node.launch.console.integratedTerminal.description'),
                refString('node.launch.console.externalTerminal.description'),
            ],
            description: refString('node.launch.console.description'),
            default: 'internalConsole',
        }, args: {
            type: 'array',
            description: refString('node.launch.args.description'),
            items: {
                type: 'string',
            },
            default: [],
        }, restart: Object.assign({ description: refString('node.launch.restart.description') }, nodeAttachConfig.configurationAttributes.restart), runtimeExecutable: {
            type: ['string', 'null'],
            markdownDescription: refString('node.launch.runtimeExecutable.description'),
            default: 'node',
        }, runtimeVersion: {
            type: 'string',
            markdownDescription: refString('node.launch.runtimeVersion.description'),
            default: 'default',
        }, runtimeArgs: {
            type: 'array',
            description: refString('node.launch.runtimeArgs.description'),
            items: {
                type: 'string',
            },
            default: [],
        }, profileStartup: {
            type: 'boolean',
            description: refString('node.profileStartup.description'),
            default: true,
        }, attachSimplePort: {
            type: 'integer',
            description: refString('node.attachSimplePort.description'),
            default: 9229,
        }, killBehavior: {
            type: 'string',
            enum: ["forceful" /* Forceful */, "polite" /* Polite */, "none" /* None */],
            default: "forceful" /* Forceful */,
            markdownDescription: refString('node.killBehavior.description'),
        } }),
    defaults: configuration_1.nodeLaunchConfigDefaults,
};
const nodeTerminalConfiguration = {
    type: "node-terminal" /* Terminal */,
    request: 'launch',
    label: refString('debug.terminal.label'),
    languages: [],
    configurationSnippets: [
        {
            label: refString('debug.terminal.snippet.label'),
            description: refString('debug.terminal.snippet.label'),
            body: {
                type: "node-terminal" /* Terminal */,
                request: 'launch',
                name: 'Run npm start',
                command: 'npm start',
            },
        },
    ],
    configurationAttributes: Object.assign(Object.assign({}, nodeBaseConfigurationAttributes), { command: {
            type: ['string', 'null'],
            description: refString('debug.terminal.program.description'),
            default: 'npm start',
        } }),
    defaults: configuration_1.terminalBaseDefaults,
};
/**
 * Shared Chrome configuration.
 */
const chromiumBaseConfigurationAttributes = Object.assign(Object.assign({}, baseConfigurationAttributes), { disableNetworkCache: {
        type: 'boolean',
        description: refString('browser.disableNetworkCache.description'),
        default: true,
    }, pathMapping: {
        type: 'object',
        description: refString('browser.pathMapping.description'),
        default: {},
    }, webRoot: {
        type: 'string',
        description: refString('browser.webRoot.description'),
        default: '${workspaceFolder}',
    }, urlFilter: {
        type: 'string',
        description: refString('browser.urlFilter.description'),
        default: '',
    }, url: {
        type: 'string',
        description: refString('browser.url.description'),
        default: 'http://localhost:8080',
    }, inspectUri: {
        type: ['string', 'null'],
        description: refString('browser.inspectUri.description'),
        default: null,
    }, vueComponentPaths: {
        type: 'array',
        description: refString('browser.vueComponentPaths'),
        default: ['${workspaceFolder}/**/*.vue'],
    }, server: {
        oneOf: [
            {
                type: 'object',
                description: refString('browser.server.description'),
                additionalProperties: false,
                default: { program: 'node my-server.js' },
                properties: nodeLaunchConfig.configurationAttributes,
            },
            {
                type: 'object',
                description: refString('debug.terminal.label'),
                additionalProperties: false,
                default: { program: 'npm start' },
                properties: nodeTerminalConfiguration.configurationAttributes,
            },
        ],
    }, perScriptSourcemaps: {
        type: 'string',
        default: 'auto',
        enum: ['yes', 'no', 'auto'],
        description: refString('browser.perScriptSourcemaps.description'),
    } });
/**
 * Shared Chrome attach.
 */
const chromiumAttachConfigurationAttributes = Object.assign(Object.assign({}, chromiumBaseConfigurationAttributes), { address: {
        type: 'string',
        description: refString('browser.address.description'),
        default: 'localhost',
    }, port: {
        type: 'number',
        description: refString('browser.attach.port.description'),
        default: 9229,
    }, restart: {
        type: 'boolean',
        markdownDescription: refString('browser.restart'),
        default: false,
    }, targetSelection: {
        type: 'string',
        markdownDescription: refString('browser.targetSelection'),
        enum: ['pick', 'automatic'],
        default: 'automatic',
    }, browserAttachLocation: {
        description: refString('browser.browserAttachLocation.description'),
        default: null,
        oneOf: [
            {
                type: 'null',
            },
            {
                type: 'string',
                enum: ['ui', 'workspace'],
            },
        ],
    } });
const chromeLaunchConfig = {
    type: "pwa-chrome" /* Chrome */,
    request: 'launch',
    label: refString('chrome.label'),
    languages: browserLanguages,
    configurationSnippets: [
        {
            label: refString('chrome.launch.label'),
            description: refString('chrome.launch.description'),
            body: {
                type: "pwa-chrome" /* Chrome */,
                request: 'launch',
                name: 'Launch Chrome',
                url: 'http://localhost:8080',
                webRoot: '^"${2:\\${workspaceFolder\\}}"',
            },
        },
    ],
    configurationAttributes: Object.assign(Object.assign({}, chromiumBaseConfigurationAttributes), { port: {
            type: 'number',
            description: refString('browser.launch.port.description'),
            default: 0,
        }, file: {
            type: 'string',
            description: refString('browser.file.description'),
            default: '${workspaceFolder}/index.html',
        }, userDataDir: {
            type: ['string', 'boolean'],
            description: refString('browser.userDataDir.description'),
            default: true,
        }, includeDefaultArgs: {
            type: 'boolean',
            description: refString('browser.includeDefaultArgs.description'),
            default: true,
        }, runtimeExecutable: {
            type: ['string', 'null'],
            description: refString('browser.runtimeExecutable.description'),
            default: 'stable',
        }, runtimeArgs: {
            type: 'array',
            description: refString('browser.runtimeArgs.description'),
            items: {
                type: 'string',
            },
            default: [],
        }, env: {
            type: 'object',
            description: refString('browser.env.description'),
            default: {},
        }, cwd: {
            type: 'string',
            description: refString('browser.cwd.description'),
            default: null,
        }, profileStartup: {
            type: 'boolean',
            description: refString('browser.profileStartup.description'),
            default: true,
        }, cleanUp: {
            type: 'string',
            enum: ['wholeBrowser', 'onlyTab'],
            description: refString('browser.cleanUp.description'),
            default: 'wholeBrowser',
        }, browserLaunchLocation: {
            description: refString('browser.browserLaunchLocation.description'),
            default: null,
            oneOf: [
                {
                    type: 'null',
                },
                {
                    type: 'string',
                    enum: ['ui', 'workspace'],
                },
            ],
        } }),
    defaults: configuration_1.chromeLaunchConfigDefaults,
};
const chromeAttachConfig = {
    type: "pwa-chrome" /* Chrome */,
    request: 'attach',
    label: refString('chrome.label'),
    languages: browserLanguages,
    configurationSnippets: [
        {
            label: refString('chrome.attach.label'),
            description: refString('chrome.attach.description'),
            body: {
                type: "pwa-chrome" /* Chrome */,
                request: 'attach',
                name: 'Attach to Chrome',
                port: 9222,
                webRoot: '^"${2:\\${workspaceFolder\\}}"',
            },
        },
    ],
    configurationAttributes: chromiumAttachConfigurationAttributes,
    defaults: configuration_1.chromeAttachConfigDefaults,
};
const extensionHostConfig = {
    type: "pwa-extensionHost" /* ExtensionHost */,
    request: 'launch',
    label: refString('extensionHost.label'),
    languages: commonLanguages,
    required: ['args'],
    configurationSnippets: [
        {
            label: refString('extensionHost.snippet.launch.label'),
            description: refString('extensionHost.snippet.launch.description'),
            body: {
                type: "pwa-extensionHost" /* ExtensionHost */,
                request: 'launch',
                name: refString('extensionHost.launch.config.name'),
                args: ['^"--extensionDevelopmentPath=\\${workspaceFolder}"'],
                outFiles: ['^"\\${workspaceFolder}/out/**/*.js"'],
                preLaunchTask: 'npm',
            },
        },
    ],
    configurationAttributes: Object.assign(Object.assign({}, nodeBaseConfigurationAttributes), { args: {
            type: 'array',
            description: refString('node.launch.args.description'),
            items: {
                type: 'string',
            },
            default: ['--extensionDevelopmentPath=${workspaceFolder}'],
        }, runtimeExecutable: {
            type: ['string', 'null'],
            markdownDescription: refString('extensionHost.launch.runtimeExecutable.description'),
            default: 'node',
        }, debugWebviews: {
            markdownDescription: refString('extensionHost.launch.debugWebviews'),
            default: true,
            type: ['boolean'],
        }, debugWebWorkerHost: {
            markdownDescription: refString('extensionHost.launch.debugWebWorkerHost'),
            default: true,
            type: ['boolean'],
        }, rendererDebugOptions: {
            markdownDescription: refString('extensionHost.launch.rendererDebugOptions'),
            type: 'object',
            default: {
                webRoot: '${workspaceFolder}',
            },
            properties: chromiumAttachConfigurationAttributes,
        } }),
    defaults: configuration_1.extensionHostConfigDefaults,
};
const edgeLaunchConfig = {
    type: "pwa-msedge" /* Edge */,
    request: 'launch',
    label: refString('edge.launch.label'),
    languages: browserLanguages,
    configurationSnippets: [
        {
            label: refString('edge.launch.label'),
            description: refString('edge.launch.description'),
            body: {
                type: "pwa-msedge" /* Edge */,
                request: 'launch',
                name: 'Launch Edge',
                url: 'http://localhost:8080',
                webRoot: '^"${2:\\${workspaceFolder\\}}"',
            },
        },
    ],
    configurationAttributes: Object.assign(Object.assign({}, chromeLaunchConfig.configurationAttributes), { runtimeExecutable: {
            type: ['string', 'null'],
            description: refString('browser.runtimeExecutable.edge.description'),
            default: 'stable',
        }, useWebView: {
            type: 'boolean',
            description: refString('edge.useWebView.description'),
            default: false,
        }, address: {
            type: 'string',
            description: refString('edge.address.description'),
            default: 'localhost',
        }, port: {
            type: 'number',
            description: refString('edge.port.description'),
            default: 9229,
        } }),
    defaults: configuration_1.edgeLaunchConfigDefaults,
};
const edgeAttachConfig = {
    type: "pwa-msedge" /* Edge */,
    request: 'attach',
    label: refString('edge.label'),
    languages: browserLanguages,
    configurationSnippets: [
        {
            label: refString('edge.attach.label'),
            description: refString('edge.attach.description'),
            body: {
                type: "pwa-msedge" /* Edge */,
                request: 'attach',
                name: 'Attach to Edge',
                port: 9222,
                webRoot: '^"${2:\\${workspaceFolder\\}}"',
            },
        },
    ],
    configurationAttributes: Object.assign(Object.assign({}, chromiumAttachConfigurationAttributes), { useWebView: {
            type: 'boolean',
            description: refString('edge.useWebView.description'),
            default: false,
        } }),
    defaults: configuration_1.edgeAttachConfigDefaults,
};
exports.debuggers = [
    nodeAttachConfig,
    nodeLaunchConfig,
    nodeTerminalConfiguration,
    extensionHostConfig,
    chromeLaunchConfig,
    chromeAttachConfig,
    edgeLaunchConfig,
    edgeAttachConfig,
];
function buildDebuggers() {
    // eslint-disable-next-line
    const output = [];
    for (const d of exports.debuggers) {
        let entry = output.find(o => o.type === d.type);
        if (!entry) {
            // eslint-disable-next-line
            const { request, configurationAttributes, required, defaults } = d, rest = __rest(d, ["request", "configurationAttributes", "required", "defaults"]);
            entry = Object.assign(Object.assign({}, rest), { aiKey: appInsightsKey, configurationAttributes: {}, configurationSnippets: [] });
            output.push(entry);
        }
        entry.configurationSnippets.push(...d.configurationSnippets);
        entry.configurationAttributes[d.request] = {
            required: d.required,
            properties: objUtils_1.mapValues(d.configurationAttributes, (_a) => {
                var { docDefault: _ } = _a, attrs = __rest(_a, ["docDefault"]);
                return attrs;
            }),
        };
    }
    return objUtils_1.walkObject(output, objUtils_1.sortKeys);
}
const configurationSchema = {
    ["debug.javascript.usePreview" /* UsePreviewDebugger */]: {
        type: 'boolean',
        default: true,
        description: refString('configuration.usePreview'),
    },
    ["debug.javascript.codelens.npmScripts" /* NpmScriptLens */]: {
        enum: ['top', 'all', 'never'],
        default: 'top',
        description: refString('configuration.npmScriptLensLocation'),
    },
    ["debug.javascript.terminalOptions" /* TerminalDebugConfig */]: {
        type: 'object',
        description: refString('configuration.terminalOptions'),
        default: {},
        properties: nodeTerminalConfiguration.configurationAttributes,
    },
    ["debug.javascript.suggestPrettyPrinting" /* SuggestPrettyPrinting */]: {
        type: 'boolean',
        description: refString('configuration.suggestPrettyPrinting'),
        default: true,
    },
    ["debug.javascript.automaticallyTunnelRemoteServer" /* AutoServerTunnelOpen */]: {
        type: 'boolean',
        description: refString('configuration.automaticallyTunnelRemoteServer'),
        default: true,
    },
    ["debug.javascript.debugByLinkOptions" /* DebugByLinkOptions */]: {
        default: 'on',
        description: refString('configuration.debugByLinkOptions'),
        oneOf: [
            {
                type: 'string',
                enum: ['on', 'off', 'always'],
            },
            {
                type: 'object',
                properties: Object.assign(Object.assign({}, chromeLaunchConfig.configurationAttributes), { enabled: {
                        type: 'string',
                        enum: ['on', 'off', 'always'],
                    } }),
            },
        ],
    },
    ["debug.javascript.pickAndAttachOptions" /* PickAndAttachDebugOptions */]: {
        type: 'object',
        default: {},
        markdownDescription: refString('configuration.pickAndAttachOptions'),
        properties: nodeAttachConfig.configurationAttributes,
    },
    ["debug.javascript.autoExpandGetters" /* AutoExpandGetters */]: {
        type: 'boolean',
        default: false,
        markdownDescription: refString('configuration.autoExpandGetters'),
    },
    ["debug.javascript.autoAttachFilter" /* AutoAttachMode */]: {
        type: 'string',
        default: "disabled" /* Disabled */,
        enum: [
            "always" /* Always */,
            "smart" /* Smart */,
            "onlyWithFlag" /* OnlyWithFlag */,
            "disabled" /* Disabled */,
        ],
        enumDescriptions: [
            refString('configuration.autoAttachMode.always'),
            refString('configuration.autoAttachMode.smart'),
            refString('configuration.autoAttachMode.explicit'),
            refString('configuration.autoAttachMode.disabled'),
        ],
        markdownDescription: refString('configuration.autoAttachMode'),
    },
    ["debug.javascript.autoAttachSmartPattern" /* AutoAttachSmartPatterns */]: {
        type: 'array',
        items: {
            type: 'string',
        },
        default: ['${workspaceFolder}/**', '!**/node_modules/**', `**/${knownTools_1.knownToolToken}/**`],
        markdownDescription: refString('configuration.autoAttachSmartPatterns'),
    },
    ["debug.javascript.breakOnConditionalError" /* BreakOnConditionalError */]: {
        type: 'boolean',
        default: false,
        markdownDescription: refString('configuration.breakOnConditionalError'),
    },
    ["debug.javascript.unmapMissingSources" /* UnmapMissingSources */]: {
        type: 'boolean',
        default: false,
        description: refString('configuration.unmapMissingSources'),
    },
    ["debug.javascript.defaultRuntimeExecutable" /* DefaultRuntimeExecutables */]: {
        type: 'object',
        default: {
            ["pwa-node" /* Node */]: 'node',
        },
        markdownDescription: refString('configuration.defaultRuntimeExecutables'),
        properties: ["pwa-node" /* Node */, "pwa-chrome" /* Chrome */, "pwa-msedge" /* Edge */].reduce((obj, type) => (Object.assign(Object.assign({}, obj), { [type]: { type: 'string' } })), {}),
    },
    ["debug.javascript.resourceRequestOptions" /* ResourceRequestOptions */]: {
        type: 'object',
        default: {},
        markdownDescription: refString('configuration.resourceRequestOptions'),
    },
};
const commands = [
    {
        command: "extension.js-debug.prettyPrint" /* PrettyPrint */,
        title: refString('pretty.print.script'),
        category: 'Debug',
    },
    {
        command: "extension.js-debug.toggleSkippingFile" /* ToggleSkipping */,
        title: refString('toggle.skipping.this.file'),
        category: 'Debug',
    },
    {
        command: "extension.js-debug.addCustomBreakpoints" /* AddCustomBreakpoints */,
        title: refString('add.browser.breakpoint'),
        icon: '$(add)',
    },
    {
        command: "extension.js-debug.removeCustomBreakpoint" /* RemoveCustomBreakpoint */,
        title: refString('remove.browser.breakpoint'),
        icon: '$(remove)',
    },
    {
        command: "extension.js-debug.removeAllCustomBreakpoints" /* RemoveAllCustomBreakpoints */,
        title: refString('remove.browser.breakpoint.all'),
        icon: '$(close-all)',
    },
    {
        command: "extension.pwa-node-debug.attachNodeProcess" /* AttachProcess */,
        title: refString('attach.node.process'),
        category: 'Debug',
    },
    {
        command: "extension.js-debug.npmScript" /* DebugNpmScript */,
        title: refString('debug.npm.script'),
        category: 'Debug',
    },
    {
        command: "extension.js-debug.createDebuggerTerminal" /* CreateDebuggerTerminal */,
        title: refString('debug.terminal.label'),
        category: 'Debug',
    },
    {
        command: "extension.js-debug.startProfile" /* StartProfile */,
        title: refString('profile.start'),
        category: 'Debug',
        icon: '$(record)',
    },
    {
        command: "extension.js-debug.stopProfile" /* StopProfile */,
        title: refString('profile.stop'),
        category: 'Debug',
        icon: 'resources/dark/stop-profiling.svg',
    },
    {
        command: "extension.js-debug.revealPage" /* RevealPage */,
        title: refString('browser.revealPage'),
        category: 'Debug',
    },
    {
        command: "extension.js-debug.debugLink" /* DebugLink */,
        title: refString('debugLink.label'),
        category: 'Debug',
    },
    {
        command: "extension.js-debug.createDiagnostics" /* CreateDiagnostics */,
        title: refString('createDiagnostics.label'),
        category: 'Debug',
    },
    {
        command: "extension.node-debug.startWithStopOnEntry" /* StartWithStopOnEntry */,
        title: refString('startWithStopOnEntry.label'),
        category: 'Debug',
    },
    {
        command: "extension.js-debug.openEdgeDevTools" /* OpenEdgeDevTools */,
        title: refString('openEdgeDevTools.label'),
        icon: '$(inspect)',
        category: 'Debug',
    },
];
const menus = {
    commandPalette: [
        {
            command: "extension.js-debug.prettyPrint" /* PrettyPrint */,
            title: refString('pretty.print.script'),
            when: forAnyDebugType('debugType', 'inDebugMode'),
        },
        {
            command: "extension.js-debug.startProfile" /* StartProfile */,
            title: refString('profile.start'),
            when: forAnyDebugType('debugType', 'inDebugMode && !jsDebugIsProfiling'),
        },
        {
            command: "extension.js-debug.stopProfile" /* StopProfile */,
            title: refString('profile.stop'),
            when: forAnyDebugType('debugType', 'inDebugMode && jsDebugIsProfiling'),
        },
        {
            command: "extension.js-debug.revealPage" /* RevealPage */,
            when: 'false',
        },
        {
            command: "extension.js-debug.debugLink" /* DebugLink */,
            title: refString('debugLink.label'),
            when: '!isWeb',
        },
        {
            command: "extension.js-debug.createDiagnostics" /* CreateDiagnostics */,
            title: refString('createDiagnostics.label'),
            when: forAnyDebugType('debugType', 'inDebugMode'),
        },
        {
            command: "extension.js-debug.openEdgeDevTools" /* OpenEdgeDevTools */,
            title: refString('openEdgeDevTools.label'),
            when: `debugType == ${"pwa-msedge" /* Edge */}`,
        },
    ],
    'debug/callstack/context': [
        {
            command: "extension.js-debug.revealPage" /* RevealPage */,
            group: 'navigation',
            when: forBrowserDebugType('debugType', `callStackItemType == 'session'`),
        },
        {
            command: "extension.js-debug.toggleSkippingFile" /* ToggleSkipping */,
            group: 'navigation',
            when: forAnyDebugType('debugType', `callStackItemType == 'session'`),
        },
        {
            command: "extension.js-debug.startProfile" /* StartProfile */,
            group: 'navigation',
            when: forAnyDebugType('debugType', `!jsDebugIsProfiling && callStackItemType == 'session'`),
        },
        {
            command: "extension.js-debug.stopProfile" /* StopProfile */,
            group: 'navigation',
            when: forAnyDebugType('debugType', `jsDebugIsProfiling && callStackItemType == 'session'`),
        },
        {
            command: "extension.js-debug.startProfile" /* StartProfile */,
            group: 'inline',
            when: forAnyDebugType('debugType', '!jsDebugIsProfiling'),
        },
        {
            command: "extension.js-debug.stopProfile" /* StopProfile */,
            group: 'inline',
            when: forAnyDebugType('debugType', 'jsDebugIsProfiling'),
        },
    ],
    'debug/toolBar': [
        {
            command: "extension.js-debug.stopProfile" /* StopProfile */,
            when: forAnyDebugType('debugType', 'jsDebugIsProfiling'),
        },
        {
            command: "extension.js-debug.openEdgeDevTools" /* OpenEdgeDevTools */,
            when: `debugType == ${"pwa-msedge" /* Edge */}`,
        },
    ],
    'view/title': [
        {
            command: "extension.js-debug.addCustomBreakpoints" /* AddCustomBreakpoints */,
            when: 'view == jsBrowserBreakpoints',
        },
        {
            command: "extension.js-debug.removeAllCustomBreakpoints" /* RemoveAllCustomBreakpoints */,
            when: 'view == jsBrowserBreakpoints',
        },
    ],
    'view/item/context': [
        {
            command: "extension.js-debug.removeCustomBreakpoint" /* RemoveCustomBreakpoint */,
            when: 'view == jsBrowserBreakpoints',
            group: 'inline',
        },
        {
            command: "extension.js-debug.addCustomBreakpoints" /* AddCustomBreakpoints */,
            when: 'view == jsBrowserBreakpoints',
        },
        {
            command: "extension.js-debug.removeCustomBreakpoint" /* RemoveCustomBreakpoint */,
            when: 'view == jsBrowserBreakpoints',
        },
    ],
};
const keybindings = [
    {
        command: "extension.node-debug.startWithStopOnEntry" /* StartWithStopOnEntry */,
        key: 'F10',
        mac: 'F10',
        when: forNodeDebugType('debugConfigurationType', '!inDebugMode'),
    },
    {
        command: "extension.node-debug.startWithStopOnEntry" /* StartWithStopOnEntry */,
        key: 'F11',
        mac: 'F11',
        when: forNodeDebugType('debugConfigurationType', '!inDebugMode'),
    },
];
if (require.main === module) {
    process.stdout.write(JSON.stringify({
        capabilities: {
            virtualWorkspaces: false,
            untrustedWorkspaces: {
                supported: 'limited',
                description: refString('workspaceTrust.description'),
            },
        },
        activationEvents: [
            ...[...contributionUtils_1.allCommands].map(cmd => `onCommand:${cmd}`),
            ...exports.debuggers.map(dbg => `onDebugResolve:${dbg.type}`),
            `onWebviewPanel:${"jsDebugDiagnostics" /* DiagnosticsView */}`,
        ],
        contributes: {
            menus,
            breakpoints: configuration_1.breakpointLanguages.map(language => ({ language })),
            debuggers: buildDebuggers(),
            commands,
            keybindings,
            configuration: {
                title: 'JavaScript Debugger',
                properties: configurationSchema,
            },
        },
    }));
}
//# sourceMappingURL=generate-contributions.js.map
//# sourceMappingURL=generate-contributions.js.map
