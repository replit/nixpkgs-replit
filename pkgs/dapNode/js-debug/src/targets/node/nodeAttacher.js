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
exports.NodeAttacher = void 0;
const inversify_1 = require("inversify");
const nls = __importStar(require("vscode-nls"));
const portLeaseTracker_1 = require("../../adapter/portLeaseTracker");
const templates_1 = require("../../adapter/templates");
const cancellation_1 = require("../../common/cancellation");
const logging_1 = require("../../common/logging");
const promiseUtil_1 = require("../../common/promiseUtil");
const urlUtils_1 = require("../../common/urlUtils");
const endpoints_1 = require("../browser/spawn/endpoints");
const sourcePathResolverFactory_1 = require("../sourcePathResolverFactory");
const lease_file_1 = require("./lease-file");
const nodeAttacherBase_1 = require("./nodeAttacherBase");
const nodeAttacherCluster_1 = require("./nodeAttacherCluster");
const nodeBinaryProvider_1 = require("./nodeBinaryProvider");
const program_1 = require("./program");
const restartPolicy_1 = require("./restartPolicy");
const watchdogSpawn_1 = require("./watchdogSpawn");
const localize = nls.loadMessageBundle();
/**
 * Attaches to ongoing Node processes. This works pretty similar to the
 * existing Node launcher, except with how we attach to the entry point:
 * we don't have the bootloader in there, so we manually attach and enable
 * the debugger, then evaluate and set the environment variables so that
 * child processes operate just like those we boot with the NodeLauncher.
 */
let NodeAttacher = class NodeAttacher extends nodeAttacherBase_1.NodeAttacherBase {
    constructor(pathProvider, logger, pathResolverFactory, portLeaseTracker, restarters = new restartPolicy_1.RestartPolicyFactory()) {
        super(pathProvider, logger, portLeaseTracker, pathResolverFactory);
        this.restarters = restarters;
    }
    /**
     * @inheritdoc
     */
    resolveParams(params) {
        return params.type === "pwa-node" /* Node */ && params.request === 'attach' ? params : undefined;
    }
    /**
     * @inheritdoc
     */
    async launchProgram(runData) {
        const doLaunch = async (restartPolicy, restarting) => {
            const prevProgram = this.program;
            let inspectorURL;
            try {
                if (runData.params.websocketAddress) {
                    inspectorURL = runData.params.websocketAddress;
                }
                else {
                    inspectorURL = await endpoints_1.retryGetNodeEndpoint(`http://${runData.params.address}:${runData.params.port}`, restarting
                        ? cancellation_1.CancellationTokenSource.withTimeout(runData.params.timeout).token
                        : runData.context.cancellationToken, this.logger);
                }
            }
            catch (e) {
                if (prevProgram && prevProgram === restarting /* is a restart */) {
                    return restart(restartPolicy, prevProgram, { killed: false, code: 1 });
                }
                else {
                    throw e;
                }
            }
            const watchdog = await watchdogSpawn_1.WatchDog.attach({
                ipcAddress: runData.serverAddress,
                scriptName: 'Remote Process',
                inspectorURL,
                waitForDebugger: true,
                dynamicAttach: true,
            });
            const program = (this.program = new program_1.WatchDogProgram(watchdog));
            program.stopped.then(r => restart(restartPolicy.reset(), program, r));
        };
        const restart = async (restartPolicy, program, result) => {
            if (this.program !== program) {
                return;
            }
            if (result.killed) {
                this.onProgramTerminated(result);
                return;
            }
            const nextRestart = restartPolicy.next();
            if (!nextRestart) {
                this.onProgramTerminated(result);
                return;
            }
            runData.context.dap.output({
                output: localize('node.attach.restart.message', 'Lost connection to debugee, reconnecting in {0}ms\r\n', nextRestart.delay),
            });
            const deferred = new program_1.StubProgram();
            this.program = deferred;
            const killed = await Promise.race([promiseUtil_1.delay(nextRestart.delay), deferred.stopped]);
            if (this.program !== deferred) {
                return;
            }
            if (killed) {
                this.onProgramTerminated(result);
            }
            else {
                doLaunch(nextRestart, deferred);
            }
        };
        return doLaunch(this.restarters.create(runData.params.restart));
    }
    /**
     * @override
     */
    createLifecycle(cdp, run, target) {
        if (target.openerId) {
            return {};
        }
        let leaseFile;
        return {
            initialized: async () => {
                leaseFile = this.onFirstInitialize(cdp, run, target);
                await leaseFile;
            },
            close: () => {
                var _a;
                // A close while we're still attach indicates a graceful shutdown.
                if (this.targetList().length) {
                    (_a = this.program) === null || _a === void 0 ? void 0 : _a.stop();
                }
                leaseFile === null || leaseFile === void 0 ? void 0 : leaseFile.then(l => l.dispose());
            },
        };
    }
    async onFirstInitialize(cdp, run, parentInfo) {
        // We use a lease file to indicate to the process that the debugger is
        // still running. This is needed because once we attach, we set the
        // NODE_OPTIONS for the process, forever. We can try to unset this on
        // close, but this isn't reliable as it's always possible
        const leaseFile = new lease_file_1.LeaseFile();
        await leaseFile.startTouchLoop();
        const binary = await this.resolveNodePath(run.params);
        const [telemetry] = await Promise.all([
            this.gatherTelemetryFromCdp(cdp, run),
            this.setEnvironmentVariables(cdp, run, leaseFile.path, parentInfo.targetId, binary),
        ]);
        if (telemetry && run.params.attachExistingChildren) {
            nodeAttacherCluster_1.watchAllChildren({
                pid: telemetry.processId,
                nodePath: binary.path,
                hostname: run.params.address,
                ipcAddress: run.serverAddress,
            }, parentInfo.targetId, this.logger).catch(err => this.logger.warn("internal" /* Internal */, 'Error watching child processes', { err }));
        }
        return leaseFile;
    }
    async setEnvironmentVariables(cdp, run, leasePath, openerId, binary) {
        if (!run.params.autoAttachChildProcesses) {
            return;
        }
        if (!(await urlUtils_1.isLoopback(run.params.address))) {
            this.logger.warn("runtime.target" /* RuntimeTarget */, 'Cannot attach to children of remote process');
            return;
        }
        const vars = await this.resolveEnvironment(run, binary, { requireLease: leasePath, openerId });
        for (let retries = 0; retries < 5; retries++) {
            const result = await cdp.Runtime.evaluate({
                contextId: 1,
                returnByValue: true,
                expression: `typeof process === 'undefined' || process.pid === undefined ? 'process not defined' : Object.assign(process.env, ${JSON.stringify(vars.defined())})` + templates_1.getSourceSuffix(),
            });
            if (!result) {
                this.logger.error("runtime.target" /* RuntimeTarget */, 'Undefined result setting child environment vars');
                return;
            }
            if (!result.exceptionDetails && result.result.value !== 'process not defined') {
                return;
            }
            this.logger.error("runtime.target" /* RuntimeTarget */, 'Error setting child environment vars', result);
            await promiseUtil_1.delay(50);
        }
    }
};
NodeAttacher = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(nodeBinaryProvider_1.INodeBinaryProvider)),
    __param(1, inversify_1.inject(logging_1.ILogger)),
    __param(2, inversify_1.inject(sourcePathResolverFactory_1.ISourcePathResolverFactory)),
    __param(3, inversify_1.inject(portLeaseTracker_1.IPortLeaseTracker))
], NodeAttacher);
exports.NodeAttacher = NodeAttacher;
//# sourceMappingURL=nodeAttacher.js.map
//# sourceMappingURL=nodeAttacher.js.map
