"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeLauncher = void 0;
const inversify_1 = require("inversify");
const path_1 = require("path");
const breakpointPredictor_1 = require("../../adapter/breakpointPredictor");
const portLeaseTracker_1 = require("../../adapter/portLeaseTracker");
const fsUtils_1 = require("../../common/fsUtils");
const logging_1 = require("../../common/logging");
const pathUtils_1 = require("../../common/pathUtils");
const promiseUtil_1 = require("../../common/promiseUtil");
const urlUtils_1 = require("../../common/urlUtils");
const configurationUtils_1 = require("../../ui/configurationUtils");
const endpoints_1 = require("../browser/spawn/endpoints");
const sourcePathResolverFactory_1 = require("../sourcePathResolverFactory");
const callback_file_1 = require("./callback-file");
const nodeBinaryProvider_1 = require("./nodeBinaryProvider");
const nodeLauncherBase_1 = require("./nodeLauncherBase");
const packageJsonProvider_1 = require("./packageJsonProvider");
const processLauncher_1 = require("./processLauncher");
const program_1 = require("./program");
const restartPolicy_1 = require("./restartPolicy");
const watchdogSpawn_1 = require("./watchdogSpawn");
/**
 * Tries to get the "program" entrypoint from the config. It a program
 * is explicitly provided, it grabs that, otherwise it looks for the first
 * existent path within the launch arguments.
 */
const tryGetProgramFromArgs = async (fsUtils, config) => {
    if (typeof config.stopOnEntry === 'string') {
        return path_1.resolve(config.cwd, config.stopOnEntry);
    }
    if (config.program) {
        return path_1.resolve(config.cwd, config.program);
    }
    for (const arg of config.args) {
        if (arg.startsWith('-')) {
            // looks like a flag
            continue;
        }
        const candidate = path_1.resolve(config.cwd, arg);
        if (await fsUtils.exists(candidate)) {
            return candidate;
        }
    }
    return undefined;
};
let NodeLauncher = class NodeLauncher extends nodeLauncherBase_1.NodeLauncherBase {
    constructor(pathProvider, logger, bpPredictor, launchers, restarters, fsUtils, packageJson, pathResolverFactory, portLeaseTracker) {
        super(pathProvider, logger, portLeaseTracker, pathResolverFactory);
        this.bpPredictor = bpPredictor;
        this.launchers = launchers;
        this.restarters = restarters;
        this.fsUtils = fsUtils;
        this.packageJson = packageJson;
    }
    /**
     * @inheritdoc
     */
    resolveParams(params) {
        let config;
        if (params.type === "pwa-node" /* Node */ && params.request === 'launch') {
            config = Object.assign({}, params);
        }
        else if ('server' in params && params.server && 'program' in params.server) {
            config = Object.assign({}, params.server);
        }
        if (!config) {
            return undefined;
        }
        configurationUtils_1.fixInspectFlags(config);
        return config;
    }
    /**
     * Launches the program.
     */
    async launchProgram(runData) {
        if (runData.params.program) {
            runData.params.program = await this.tryGetCompiledFile(runData.params.program);
        }
        this.attachSimplePort = await this.getSimpleAttachPortIfAny(runData.params);
        const doLaunch = async (restartPolicy) => {
            // Close any existing program. We intentionally don't wait for stop() to
            // finish, since doing so will shut down the server.
            if (this.program) {
                this.program.stop(); // intentionally not awaited on
            }
            const binary = await this.resolveNodePath(runData.params, runData.params.runtimeExecutable || undefined);
            const callbackFile = new callback_file_1.CallbackFile();
            let env = await this.resolveEnvironment(runData, binary, {
                fileCallback: callbackFile.path,
            });
            if (this.attachSimplePort) {
                if (!runData.params.attachSimplePort) {
                    runData.context.dap.output({
                        category: 'stderr',
                        output: 'Using legacy attach mode for --inspect-brk in npm scripts. We recommend removing --inspect-brk, and using `stopOnEntry` in your launch.json if you need it.',
                    });
                }
                env = env.merge({ NODE_OPTIONS: null });
            }
            else {
                env = nodeBinaryProvider_1.hideDebugInfoFromConsole(binary, env);
            }
            const options = Object.assign(Object.assign({}, runData.params), { env: env.value });
            const launcher = this.launchers.find(l => l.canLaunch(options));
            if (!launcher) {
                throw new Error('Cannot find an appropriate launcher for the given set of options');
            }
            let program = await launcher.launchProgram(binary.path, options, runData.context);
            if (this.attachSimplePort) {
                const wd = await watchdogSpawn_1.WatchDog.attach({
                    ipcAddress: runData.serverAddress,
                    scriptName: 'Remote Process',
                    inspectorURL: await endpoints_1.retryGetNodeEndpoint(`http://127.0.0.1:${this.attachSimplePort}`, runData.context.cancellationToken, this.logger),
                    waitForDebugger: true,
                    dynamicAttach: true,
                });
                program = new program_1.CombinedProgram(program, new program_1.WatchDogProgram(wd));
            }
            else {
                // Read the callback file, and signal the running program when we read data.
                callbackFile.read().then(data => {
                    if (data) {
                        program.gotTelemetery(data);
                    }
                });
            }
            this.program = program;
            // Once the program stops, dispose of the file. If we started a new program
            // in the meantime, don't do anything. Otherwise, restart if we need to,
            // and if we don't then shut down the server and indicate that we terminated.
            program.stopped.then(async (result) => {
                callbackFile.dispose();
                if (this.program !== program) {
                    return;
                }
                if (result.killed || result.code === 0) {
                    this.onProgramTerminated(result);
                    return;
                }
                const nextRestart = restartPolicy.next();
                if (!nextRestart) {
                    this.onProgramTerminated(result);
                    return;
                }
                await promiseUtil_1.delay(nextRestart.delay);
                if (this.program === program) {
                    doLaunch(nextRestart);
                }
            });
        };
        return doLaunch(this.restarters.create(runData.params.restart));
    }
    /**
     * Detects if the user wants to run an npm script that contains --inspect-brk.
     * If so, it returns the port to attach with, instead of using the bootloader.
     * @see https://github.com/microsoft/vscode-js-debug/issues/584
     */
    async getSimpleAttachPortIfAny(params) {
        var _a, _b, _c;
        if (params.attachSimplePort) {
            return params.attachSimplePort;
        }
        const script = nodeBinaryProvider_1.getRunScript(params.runtimeExecutable, params.runtimeArgs);
        if (!script) {
            return;
        }
        const packageJson = await this.packageJson.getContents();
        if (!((_b = (_a = packageJson === null || packageJson === void 0 ? void 0 : packageJson.scripts) === null || _a === void 0 ? void 0 : _a[script]) === null || _b === void 0 ? void 0 : _b.includes('--inspect-brk'))) {
            return;
        }
        return (_c = params.port) !== null && _c !== void 0 ? _c : 9229;
    }
    /**
     * @inheritdoc
     */
    createLifecycle(cdp, run, { targetId }) {
        return {
            initialized: async () => {
                if (this.attachSimplePort) {
                    await this.gatherTelemetryFromCdp(cdp, run);
                }
                if (!run.params.stopOnEntry) {
                    return;
                }
                // This is not an ideal stop-on-entry setup. The previous debug adapter
                // had life easier because it could ask the Node process to stop from
                // the get-go, but in our scenario the bootloader is the first thing
                // which is run and something we don't want to break in. We just
                // do our best to find the entrypoint from the run params.
                const program = await tryGetProgramFromArgs(this.fsUtils, run.params);
                if (!program) {
                    this.logger.warn("runtime" /* Runtime */, 'Could not resolve program entrypointfrom args');
                    return;
                }
                const breakpointId = '(?:entryBreakpoint){0}';
                const breakpointPath = urlUtils_1.absolutePathToFileUrl(program);
                const urlRegexp = urlUtils_1.urlToRegex(breakpointPath) + breakpointId;
                const breakpoint = await cdp.Debugger.setBreakpointByUrl({
                    urlRegex: urlRegexp,
                    lineNumber: 0,
                    columnNumber: 0,
                });
                return (breakpoint === null || breakpoint === void 0 ? void 0 : breakpoint.breakpointId) ? { cdpId: breakpoint === null || breakpoint === void 0 ? void 0 : breakpoint.breakpointId, path: breakpointPath }
                    : undefined;
            },
            close: () => {
                const processId = Number(targetId);
                if (processId > 0) {
                    try {
                        process.kill(processId);
                    }
                    catch (e) {
                        // ignored
                    }
                }
            },
        };
    }
    /**
     * Gets the compiled version of the given target program, if it exists and
     * we can find it. Otherwise we fall back to evaluating it directly.
     * @see https://github.com/microsoft/vscode-js-debug/issues/291
     */
    async tryGetCompiledFile(targetProgram) {
        targetProgram = pathUtils_1.fixDriveLetterAndSlashes(targetProgram);
        const ext = path_1.extname(targetProgram);
        if (!ext || ext === '.js') {
            return targetProgram;
        }
        const mapped = await this.bpPredictor.getPredictionForSource(targetProgram);
        if (!mapped || mapped.size === 0) {
            return targetProgram;
        }
        // There can be more than one compile file per source file. Just pick
        // whichever one in that case.
        const entry = mapped.values().next().value;
        if (!entry) {
            return targetProgram;
        }
        this.logger.info("runtime.launch" /* RuntimeLaunch */, 'Updating entrypoint to compiled file', {
            from: targetProgram,
            to: entry.compiledPath,
            candidates: mapped.size,
        });
        return entry.compiledPath;
    }
};
NodeLauncher = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(nodeBinaryProvider_1.INodeBinaryProvider)),
    __param(1, inversify_1.inject(logging_1.ILogger)),
    __param(2, inversify_1.inject(breakpointPredictor_1.IBreakpointsPredictor)),
    __param(3, inversify_1.multiInject(processLauncher_1.IProgramLauncher)),
    __param(4, inversify_1.inject(restartPolicy_1.RestartPolicyFactory)),
    __param(5, inversify_1.inject(fsUtils_1.IFsUtils)),
    __param(6, inversify_1.inject(packageJsonProvider_1.IPackageJsonProvider)),
    __param(7, inversify_1.inject(sourcePathResolverFactory_1.ISourcePathResolverFactory)),
    __param(8, inversify_1.inject(portLeaseTracker_1.IPortLeaseTracker))
], NodeLauncher);
exports.NodeLauncher = NodeLauncher;
//# sourceMappingURL=nodeLauncher.js.map
//# sourceMappingURL=nodeLauncher.js.map
