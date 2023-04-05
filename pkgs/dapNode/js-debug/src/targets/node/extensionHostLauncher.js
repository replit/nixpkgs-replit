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
exports.ExtensionHostLauncher = void 0;
const fs_1 = require("fs");
const inversify_1 = require("inversify");
const findOpenPort_1 = require("../../common/findOpenPort");
const vscodeRendererAttacher_1 = require("../browser/vscodeRendererAttacher");
const nodeLauncherBase_1 = require("./nodeLauncherBase");
const program_1 = require("./program");
/**
 * Boots an instance of VS Code for extension debugging. Once this happens,
 * a separate "attach" request will come in.
 */
let ExtensionHostLauncher = class ExtensionHostLauncher extends nodeLauncherBase_1.NodeLauncherBase {
    /**
     * @inheritdoc
     */
    resolveParams(params) {
        return params.type === "pwa-extensionHost" /* ExtensionHost */ && params.request === 'launch'
            ? params
            : undefined;
    }
    /**
     * @inheritdoc
     */
    async launchProgram(runData) {
        const port = runData.params.port || (await findOpenPort_1.findOpenPort());
        const result = await runData.context.dap.launchVSCodeRequest({
            args: resolveCodeLaunchArgs(runData.params, port),
            env: this.getConfiguredEnvironment(runData.params).defined(),
            debugRenderer: runData.params.debugWebviews || runData.params.debugWebWorkerHost,
        });
        if (result.rendererDebugPort) {
            vscodeRendererAttacher_1.VSCodeRendererAttacher.debugIdToRendererDebugPort.set(runData.params.__sessionId, result.rendererDebugPort);
        }
        this.program = new program_1.StubProgram();
        this.program.stop();
    }
};
ExtensionHostLauncher = __decorate([
    inversify_1.injectable()
], ExtensionHostLauncher);
exports.ExtensionHostLauncher = ExtensionHostLauncher;
const resolveCodeLaunchArgs = (launchArgs, port) => {
    // Separate all "paths" from an arguments into separate attributes.
    const args = launchArgs.args.map(arg => {
        if (arg.startsWith('-')) {
            // arg is an option
            const pair = arg.split('=', 2);
            if (pair.length === 2 && (fs_1.existsSync(pair[1]) || fs_1.existsSync(pair[1] + '.js'))) {
                return { prefix: pair[0] + '=', path: pair[1] };
            }
            return { prefix: arg };
        }
        else {
            // arg is a path
            try {
                const stat = fs_1.lstatSync(arg);
                if (stat.isDirectory()) {
                    return { prefix: '--folder-uri=', path: arg };
                }
                else if (stat.isFile()) {
                    return { prefix: '--file-uri=', path: arg };
                }
            }
            catch (err) {
                // file not found
            }
            return { path: arg }; // just return the path blindly and hope for the best...
        }
    });
    if (!launchArgs.noDebug) {
        args.unshift({ prefix: `--inspect-brk-extensions=${port}` });
    }
    args.unshift({ prefix: `--debugId=${launchArgs.__sessionId}` }); // pass the debug session ID so that broadcast events know where they come from
    return args;
};
//# sourceMappingURL=extensionHostLauncher.js.map
//# sourceMappingURL=extensionHostLauncher.js.map
