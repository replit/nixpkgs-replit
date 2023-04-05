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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionHostAttacher = void 0;
const inversify_1 = require("inversify");
const templates_1 = require("../../adapter/templates");
const semver_1 = require("../../common/semver");
const endpoints_1 = require("../browser/spawn/endpoints");
const nodeAttacherBase_1 = require("./nodeAttacherBase");
const nodeBinaryProvider_1 = require("./nodeBinaryProvider");
const program_1 = require("./program");
const watchdogSpawn_1 = require("./watchdogSpawn");
/**
 * Attaches to an instance of VS Code for extension debugging.
 */
let ExtensionHostAttacher = class ExtensionHostAttacher extends nodeAttacherBase_1.NodeAttacherBase {
    constructor() {
        super(...arguments);
        this.restarting = false;
    }
    /**
     * @inheritdoc
     */
    async restart() {
        var _a;
        this.restarting = true;
        this.onProgramTerminated({ code: 0, killed: true, restart: true });
        (_a = this.program) === null || _a === void 0 ? void 0 : _a.stop();
    }
    /**
     * @inheritdoc
     */
    resolveParams(params) {
        return params.type === "pwa-extensionHost" /* ExtensionHost */ && params.request === 'attach'
            ? params
            : undefined;
    }
    /**
     * @inheritdoc
     */
    async launchProgram(runData) {
        const inspectorURL = await endpoints_1.retryGetNodeEndpoint(`http://localhost:${runData.params.port}`, runData.context.cancellationToken, this.logger);
        const wd = await watchdogSpawn_1.WatchDog.attach({
            ipcAddress: runData.serverAddress,
            scriptName: 'Extension Host',
            inspectorURL,
            waitForDebugger: true,
            dynamicAttach: true,
        });
        const program = (this.program = new program_1.WatchDogProgram(wd));
        this.program.stopped.then(result => {
            if (program === this.program) {
                this.onProgramTerminated(result);
            }
        });
    }
    /**
     * @override
     */
    createLifecycle(cdp, run, target) {
        return target.openerId ? {} : { initialized: () => this.onFirstInitialize(cdp, run) };
    }
    /**
     * Called the first time, for each program, we get an attachment. Can
     * return disposables to clean up when the run finishes.
     */
    async onFirstInitialize(cdp, run) {
        this.setEnvironmentVariables(cdp, run);
        const telemetry = await this.gatherTelemetryFromCdp(cdp, run);
        // Monitor the process ID we read from the telemetry. Once the VS Code
        // process stops, stop our Watchdog, and vise versa.
        const watchdog = this.program;
        if (telemetry && watchdog) {
            const code = new program_1.TerminalProcess({ processId: telemetry.processId }, this.logger, "forceful" /* Forceful */);
            code.stopped.then(() => watchdog.stop());
            watchdog.stopped.then(() => {
                if (!this.restarting) {
                    code.stop();
                }
            });
        }
    }
    async setEnvironmentVariables(cdp, run) {
        if (!run.params.autoAttachChildProcesses) {
            return;
        }
        const vars = await this.resolveEnvironment(run, new nodeBinaryProvider_1.NodeBinary('node', semver_1.Semver.parse(process.versions.node)));
        const result = await cdp.Runtime.evaluate({
            contextId: 1,
            returnByValue: true,
            expression: `Object.assign(process.env, ${JSON.stringify(vars.defined())})` + templates_1.getSourceSuffix(),
        });
        if (!result) {
            this.logger.error("runtime.target" /* RuntimeTarget */, 'Undefined result setting child environment vars');
        }
        else if (result.exceptionDetails) {
            this.logger.error("runtime.target" /* RuntimeTarget */, 'Error setting child environment vars', result.exceptionDetails);
        }
    }
};
ExtensionHostAttacher = __decorate([
    inversify_1.injectable()
], ExtensionHostAttacher);
exports.ExtensionHostAttacher = ExtensionHostAttacher;
//# sourceMappingURL=extensionHostAttacher.js.map
//# sourceMappingURL=extensionHostAttacher.js.map
