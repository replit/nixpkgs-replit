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
exports.TerminalProgramLauncher = void 0;
const inversify_1 = require("inversify");
const logging_1 = require("../../common/logging");
const objUtils_1 = require("../../common/objUtils");
const errors_1 = require("../../dap/errors");
const protocolError_1 = require("../../dap/protocolError");
const processLauncher_1 = require("./processLauncher");
const program_1 = require("./program");
/**
 * Launcher that boots a subprocess.
 */
let TerminalProgramLauncher = class TerminalProgramLauncher {
    constructor(logger) {
        this.logger = logger;
    }
    canLaunch(args) {
        args.internalConsoleOptions;
        return args.console !== 'internalConsole';
    }
    async launchProgram(binary, config, context) {
        const params = {
            kind: config.console === 'integratedTerminal' ? 'integrated' : 'external',
            title: config.name,
            cwd: config.cwd,
            args: [binary, ...processLauncher_1.getNodeLaunchArgs(config)],
            env: objUtils_1.removeNulls(config.env),
        };
        let result;
        try {
            result = await this.sendLaunchRequest(params, context);
        }
        catch (err) {
            throw new protocolError_1.ProtocolError(errors_1.cannotLaunchInTerminal(err.message));
        }
        return new program_1.TerminalProcess(result, this.logger, config.killBehavior);
    }
    /**
     * Sends the launch request -- stubbed out in tests.
     */
    sendLaunchRequest(params, context) {
        return context.dap.runInTerminalRequest(params);
    }
};
TerminalProgramLauncher = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(logging_1.ILogger))
], TerminalProgramLauncher);
exports.TerminalProgramLauncher = TerminalProgramLauncher;
//# sourceMappingURL=terminalProgramLauncher.js.map
//# sourceMappingURL=terminalProgramLauncher.js.map
