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
exports.ProfileController = exports.IProfileController = void 0;
const inversify_1 = require("inversify");
const connection_1 = require("../cdp/connection");
const profiling_1 = require("./profiling");
const errors_1 = require("../dap/errors");
const protocolError_1 = require("../dap/protocolError");
const breakpoints_1 = require("./breakpoints");
const userDefinedBreakpoint_1 = require("./breakpoints/userDefinedBreakpoint");
const path_1 = require("path");
const os_1 = require("os");
const crypto_1 = require("crypto");
exports.IProfileController = Symbol('IProfileController');
let ProfileController = class ProfileController {
    constructor(cdp, factory, breakpoints) {
        this.cdp = cdp;
        this.factory = factory;
        this.breakpoints = breakpoints;
    }
    /**
     * @inheritdoc
     */
    connect(dap, thread) {
        dap.on('startProfile', async (params) => {
            await this.start(dap, thread, params);
            return {};
        });
        dap.on('stopProfile', () => this.stopProfiling(dap));
        thread.onPaused(() => this.stopProfiling(dap));
    }
    /**
     * @inheritdoc
     */
    async start(dap, thread, params) {
        if (this.profile) {
            throw new protocolError_1.ProtocolError(errors_1.invalidConcurrentProfile());
        }
        this.profile = this.startProfileInner(dap, thread, params).catch(err => {
            this.profile = undefined;
            throw err;
        });
        await this.profile;
    }
    async startProfileInner(dap, thread, params) {
        var _a;
        let keepDebuggerOn = false;
        let enableFilter;
        if ((_a = params.stopAtBreakpoint) === null || _a === void 0 ? void 0 : _a.length) {
            const toBreakpoint = new Set(params.stopAtBreakpoint);
            keepDebuggerOn = true;
            enableFilter = bp => !(bp instanceof userDefinedBreakpoint_1.UserDefinedBreakpoint) || toBreakpoint.has(bp.dapId);
        }
        else {
            enableFilter = () => false;
        }
        await this.breakpoints.applyEnabledFilter(enableFilter);
        const file = path_1.join(os_1.tmpdir(), `vscode-js-profile-${crypto_1.randomBytes(4).toString('hex')}`);
        const profile = await this.factory.get(params.type).start(params, file);
        const runningProfile = {
            file,
            profile,
            enableFilter,
            keptDebuggerOn: keepDebuggerOn,
        };
        profile.onUpdate(label => dap.profilerStateUpdate({ label, running: true }));
        profile.onStop(() => this.disposeProfile(runningProfile));
        const isPaused = !!thread.pausedDetails();
        if (keepDebuggerOn) {
            await thread.resume();
        }
        else if (isPaused) {
            await this.cdp.Debugger.disable({});
            if (isPaused) {
                thread.onResumed(); // see docs on this method for why we call it here
            }
        }
        dap.profileStarted({ file: runningProfile.file, type: params.type });
        return runningProfile;
    }
    async stopProfiling(dap) {
        var _a;
        const running = await ((_a = this.profile) === null || _a === void 0 ? void 0 : _a.catch(() => undefined));
        if (!running || !this.profile) {
            return {}; // guard against concurrent stops
        }
        this.profile = undefined;
        await (running === null || running === void 0 ? void 0 : running.profile.stop());
        dap.profilerStateUpdate({ label: '', running: false });
        return {};
    }
    async disposeProfile({ profile, enableFilter, keptDebuggerOn }) {
        if (!keptDebuggerOn) {
            await this.cdp.Debugger.enable({});
        }
        await this.breakpoints.applyEnabledFilter(undefined, enableFilter);
        profile.dispose();
    }
};
ProfileController = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(connection_1.ICdpApi)),
    __param(1, inversify_1.inject(profiling_1.IProfilerFactory)),
    __param(2, inversify_1.inject(breakpoints_1.BreakpointManager))
], ProfileController);
exports.ProfileController = ProfileController;
//# sourceMappingURL=profileController.js.map
//# sourceMappingURL=profileController.js.map
