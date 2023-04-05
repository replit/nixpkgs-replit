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
exports.createLaunchConfigFromContext = exports.guessWorkingDirectory = exports.NodeConfigurationResolver = void 0;
const fs = __importStar(require("fs"));
const inversify_1 = require("inversify");
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const nls = __importStar(require("vscode-nls"));
const console_1 = require("../../common/console");
const environmentVars_1 = require("../../common/environmentVars");
const findOpenPort_1 = require("../../common/findOpenPort");
const fsUtils_1 = require("../../common/fsUtils");
const pathUtils_1 = require("../../common/pathUtils");
const urlUtils_1 = require("../../common/urlUtils");
const configuration_1 = require("../../configuration");
const ioc_extras_1 = require("../../ioc-extras");
const nvmResolver_1 = require("../../targets/node/nvmResolver");
const configurationUtils_1 = require("../configurationUtils");
const processPicker_1 = require("../processPicker");
const baseConfigurationResolver_1 = require("./baseConfigurationResolver");
const localize = nls.loadMessageBundle();
/**
 * Configuration provider for node debugging. In order to allow for a
 * close to 1:1 drop-in, this is nearly identical to the original vscode-
 * node-debug, with support for some legacy options (mern, useWSL) removed.
 */
let NodeConfigurationResolver = class NodeConfigurationResolver extends baseConfigurationResolver_1.BaseConfigurationResolver {
    constructor(context, nvmResolver, fsUtils) {
        super(context);
        this.nvmResolver = nvmResolver;
        this.fsUtils = fsUtils;
    }
    /**
     * @inheritdoc
     */
    async resolveDebugConfigurationWithSubstitutedVariables(folder, rawConfig) {
        const config = rawConfig;
        if (config.type === "pwa-node" /* Node */ &&
            config.request === 'attach' &&
            typeof config.processId === 'string') {
            await processPicker_1.resolveProcessId(this.fsUtils, config);
        }
        return config;
    }
    /**
     * @override
     */
    async resolveDebugConfigurationAsync(folder, config, cancellationToken) {
        if (!config.name && !config.type && !config.request) {
            config = createLaunchConfigFromContext(folder, true, config);
            if (config.request === 'launch' && !config.program) {
                vscode.window.showErrorMessage(localize('program.not.found.message', 'Cannot find a program to debug'), { modal: true });
                return;
            }
        }
        // make sure that config has a 'cwd' attribute set
        if (!config.cwd) {
            config.cwd =
                config.localRoot || // https://github.com/microsoft/vscode-js-debug/issues/894#issuecomment-745449195
                    guessWorkingDirectory(config.request === 'launch' ? config.program : undefined, folder);
        }
        // if a 'remoteRoot' is specified without a corresponding 'localRoot', set 'localRoot' to the workspace folder.
        // see https://github.com/Microsoft/vscode/issues/63118
        if (config.remoteRoot && !config.localRoot) {
            config.localRoot = '${workspaceFolder}';
        }
        if (config.request === 'launch') {
            // custom node install
            this.applyDefaultRuntimeExecutable(config);
            // nvm support
            const nvmVersion = config.runtimeVersion;
            if (typeof nvmVersion === 'string' && nvmVersion !== 'default') {
                const { directory, binary } = await this.nvmResolver.resolveNvmVersionPath(nvmVersion);
                config.env = new environmentVars_1.EnvironmentVars(config.env).addToPath(directory, 'prepend', true).value;
                config.runtimeExecutable =
                    !config.runtimeExecutable || config.runtimeExecutable === 'node'
                        ? binary
                        : config.runtimeExecutable;
            }
            // when using "integratedTerminal" ensure that debug console doesn't get activated; see https://github.com/Microsoft/vscode/issues/43164
            if (config.console === 'integratedTerminal' && !config.internalConsoleOptions) {
                config.internalConsoleOptions = 'neverOpen';
            }
            // assign a random debug port if requested, otherwise remove manual
            // --inspect-brk flags, which are no longer needed and interfere
            if (config.attachSimplePort === null || config.attachSimplePort === undefined) {
                configurationUtils_1.fixInspectFlags(config);
            }
            else {
                if (config.attachSimplePort === 0) {
                    config.attachSimplePort = await findOpenPort_1.findOpenPort(undefined, cancellationToken);
                    const arg = `--inspect-brk=${config.attachSimplePort}`;
                    config.runtimeArgs = config.runtimeArgs ? [...config.runtimeArgs, arg] : [arg];
                }
                config.continueOnAttach = !config.stopOnEntry;
                config.stopOnEntry = false; // handled by --inspect-brk
            }
            // update outfiles to the nearest package root
            await guessOutFiles(this.fsUtils, folder, config);
        }
        return configuration_1.applyNodeDefaults(config);
    }
    getType() {
        return "pwa-node" /* Node */;
    }
    /**
     * @override
     */
    getSuggestedWorkspaceFolders(config) {
        return [config.rootPath, config.cwd];
    }
};
NodeConfigurationResolver = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.ExtensionContext)),
    __param(1, inversify_1.inject(nvmResolver_1.INvmResolver)),
    __param(2, inversify_1.inject(fsUtils_1.IFsUtils))
], NodeConfigurationResolver);
exports.NodeConfigurationResolver = NodeConfigurationResolver;
function guessWorkingDirectory(program, folder) {
    if (folder) {
        return folder.uri.fsPath;
    }
    // no folder -> config is a user or workspace launch config
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        return vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
    // no folder case
    if (program) {
        if (program === '${file}') {
            return '${fileDirname}';
        }
        // program is some absolute path
        if (path.isAbsolute(program)) {
            // derive 'cwd' from 'program'
            return path.dirname(program);
        }
    }
    // last resort
    return '${workspaceFolder}';
}
exports.guessWorkingDirectory = guessWorkingDirectory;
function getAbsoluteProgramLocation(folder, program) {
    if (folder) {
        program = configuration_1.resolveVariableInConfig(program, 'workspaceFolder', folder.uri.fsPath);
    }
    if (path.isAbsolute(program)) {
        return program;
    }
    if (folder) {
        return path.join(folder.uri.fsPath, program);
    }
    return undefined;
}
/**
 * Set the outFiles to the nearest package.json-containing folder relative
 * to the program, if we can find one within the workspace folder. This speeds
 * things up significantly in monorepos.
 * @see https://github.com/microsoft/vscode-js-debug/issues/326
 */
async function guessOutFiles(fsUtils, folder, config) {
    if (config.outFiles || !config.program || !folder) {
        return;
    }
    const programLocation = getAbsoluteProgramLocation(folder, config.program);
    if (!programLocation) {
        return;
    }
    const root = await urlUtils_1.nearestDirectoryContaining(fsUtils, path.dirname(programLocation), 'package.json');
    if (root && pathUtils_1.isSubdirectoryOf(folder.uri.fsPath, root)) {
        const rel = pathUtils_1.forceForwardSlashes(path.relative(folder.uri.fsPath, root));
        config.outFiles = configuration_1.resolveVariableInConfig(configuration_1.baseDefaults.outFiles, 'workspaceFolder', `\${workspaceFolder}/${rel}`);
    }
}
function createLaunchConfigFromContext(folder, resolve, existingConfig) {
    const config = {
        type: "pwa-node" /* Node */,
        request: 'launch',
        name: localize('node.launch.config.name', 'Launch Program'),
        skipFiles: ['<node_internals>/**'],
    };
    if (existingConfig && existingConfig.noDebug) {
        config.noDebug = true;
    }
    const pkg = loadJSON(folder, 'package.json');
    let program;
    let useSourceMaps = false;
    if (pkg && pkg.name === 'mern-starter') {
        if (resolve) {
            console_1.writeToConsole(localize('mern.starter.explanation', "Launch configuration for '{0}' project created.", 'Mern Starter'));
        }
        configureMern(config);
        return config;
    }
    if (pkg) {
        // try to find a value for 'program' by analysing package.json
        program = guessProgramFromPackage(folder, pkg, resolve);
        if (program && resolve) {
            console_1.writeToConsole(localize('program.guessed.from.package.json.explanation', "Launch configuration created based on 'package.json'."));
        }
    }
    if (!program) {
        // try to use file open in editor
        const editor = vscode.window.activeTextEditor;
        if (editor && configuration_1.breakpointLanguages.includes(editor.document.languageId)) {
            useSourceMaps = editor.document.languageId !== 'javascript';
            program = folder
                ? path.join('${workspaceFolder}', path.relative(folder.uri.fsPath, editor.document.uri.fsPath))
                : editor.document.uri.fsPath;
        }
    }
    // if we couldn't find a value for 'program', we just let the launch config use the file open in the editor
    if (!program) {
        program = '${file}';
    }
    if (program) {
        config.program = program;
        if (!folder) {
            config.__workspaceFolder = path.dirname(program);
        }
    }
    // prepare for source maps by adding 'outFiles' if typescript or coffeescript is detected
    if (useSourceMaps ||
        vscode.workspace.textDocuments.some(document => isTranspiledLanguage(document.languageId))) {
        if (resolve) {
            console_1.writeToConsole(localize('outFiles.explanation', "Adjust glob pattern(s) in the 'outFiles' attribute so that they cover the generated JavaScript."));
        }
        let dir = '';
        const tsConfig = loadJSON(folder, 'tsconfig.json');
        if (tsConfig && tsConfig.compilerOptions && tsConfig.compilerOptions.outDir) {
            const outDir = tsConfig.compilerOptions.outDir;
            if (!path.isAbsolute(outDir)) {
                dir = outDir;
                if (dir.indexOf('./') === 0) {
                    dir = dir.substr(2);
                }
                if (dir[dir.length - 1] !== '/') {
                    dir += '/';
                }
            }
            config.preLaunchTask = 'tsc: build - tsconfig.json';
        }
        config['outFiles'] = ['${workspaceFolder}/' + dir + '**/*.js'];
    }
    return config;
}
exports.createLaunchConfigFromContext = createLaunchConfigFromContext;
function configureMern(config) {
    if (config.request !== 'launch') {
        return;
    }
    config.runtimeExecutable = 'nodemon';
    config.program = '${workspaceFolder}/index.js';
    config.restart = true;
    config.env = { BABEL_DISABLE_CACHE: '1', NODE_ENV: 'development' };
    config.console = 'integratedTerminal';
    config.internalConsoleOptions = 'neverOpen';
}
function isTranspiledLanguage(languagId) {
    return languagId === 'typescript' || languagId === 'coffeescript';
}
function loadJSON(folder, file) {
    if (folder) {
        try {
            const content = fs.readFileSync(path.join(folder.uri.fsPath, file), 'utf8');
            return JSON.parse(content);
        }
        catch (error) {
            // silently ignore
        }
    }
    return undefined;
}
/*
 * try to find the entry point ('main') from the package.json
 */
function guessProgramFromPackage(folder, packageJson, resolve) {
    let program;
    try {
        if (packageJson.main) {
            program = packageJson.main;
        }
        else if (packageJson.scripts && typeof packageJson.scripts.start === 'string') {
            // assume a start script of the form 'node server.js'
            program = packageJson.scripts.start.split(' ').pop();
        }
        if (program) {
            let targetPath;
            if (path.isAbsolute(program)) {
                targetPath = program;
            }
            else {
                targetPath = folder ? path.join(folder.uri.fsPath, program) : undefined;
                program = path.join('${workspaceFolder}', program);
            }
            if (resolve &&
                targetPath &&
                !fs.existsSync(targetPath) &&
                !fs.existsSync(targetPath + '.js')) {
                return undefined;
            }
        }
    }
    catch (error) {
        // silently ignore
    }
    return program;
}
//# sourceMappingURL=nodeDebugConfigurationResolver.js.map
//# sourceMappingURL=nodeDebugConfigurationResolver.js.map
