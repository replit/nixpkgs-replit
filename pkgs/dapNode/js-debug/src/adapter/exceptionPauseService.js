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
exports.ExceptionPauseService = exports.IExceptionPauseService = void 0;
const inversify_1 = require("inversify");
const objUtils_1 = require("../common/objUtils");
const promiseUtil_1 = require("../common/promiseUtil");
const sourceUtils_1 = require("../common/sourceUtils");
const configuration_1 = require("../configuration");
const connection_1 = require("../dap/connection");
const errors_1 = require("../dap/errors");
const protocolError_1 = require("../dap/protocolError");
const expression_1 = require("./breakpoints/conditions/expression");
const evaluator_1 = require("./evaluator");
const scriptSkipper_1 = require("./scriptSkipper/scriptSkipper");
exports.IExceptionPauseService = Symbol('IExceptionPauseService');
let ExceptionPauseService = class ExceptionPauseService {
    constructor(evaluator, scriptSkipper, dap, launchConfig) {
        this.evaluator = evaluator;
        this.scriptSkipper = scriptSkipper;
        this.dap = dap;
        this.state = { cdp: "none" /* None */ };
        this.blocker = promiseUtil_1.getDeferred();
        this.noDebug = !!launchConfig.noDebug;
        this.breakOnError = launchConfig.__breakOnConditionalError;
        this.blocker.resolve();
    }
    get launchBlocker() {
        return this.blocker.promise;
    }
    /**
     * @inheritdoc
     */
    async setBreakpoints(params) {
        if (this.noDebug) {
            return;
        }
        try {
            this.state = this.parseBreakpointRequest(params);
        }
        catch (e) {
            if (!(e instanceof protocolError_1.ProtocolError)) {
                throw e;
            }
            this.dap.output({ category: 'stderr', output: e.message });
            return;
        }
        if (this.cdp) {
            await this.sendToCdp(this.cdp);
        }
        else if (this.state.cdp !== "none" /* None */ && this.blocker.hasSettled()) {
            this.blocker = promiseUtil_1.getDeferred();
        }
    }
    /**
     * @inheritdoc
     */
    async shouldPauseAt(evt) {
        var _a;
        if (evt.reason !== 'exception' || this.state.cdp === "none" /* None */) {
            return false;
        }
        if (this.shouldScriptSkip(evt)) {
            return false;
        }
        const cond = this.state.condition;
        if ((_a = evt.data) === null || _a === void 0 ? void 0 : _a.uncaught) {
            if (cond.uncaught && !(await this.evalCondition(evt, cond.uncaught))) {
                return false;
            }
        }
        else if (cond.caught) {
            if (!(await this.evalCondition(evt, cond.caught))) {
                return false;
            }
        }
        return true;
    }
    /**
     * @inheritdoc
     */
    async apply(cdp) {
        this.cdp = cdp;
        if (this.state.cdp !== "none" /* None */) {
            await this.sendToCdp(cdp);
        }
    }
    async sendToCdp(cdp) {
        await cdp.Debugger.setPauseOnExceptions({ state: this.state.cdp });
        this.blocker.resolve();
    }
    async evalCondition(evt, method) {
        const r = await method({ callFrameId: evt.callFrames[0].callFrameId }, { error: evt.data });
        return !!(r === null || r === void 0 ? void 0 : r.result.value);
    }
    /**
     * Setting blackbox patterns is asynchronous to when the source is loaded,
     * so if the user asks to pause on exceptions the runtime may pause in a
     * place where we don't want it to. Double check at this point and manually
     * resume debugging for handled exceptions. This implementation seems to
     * work identically to blackboxing (test cases represent this):
     *
     * - ✅ An error is thrown and caught within skipFiles. Resumed here.
     * - ✅ An uncaught error is re/thrown within skipFiles. In both cases the
     *      stack is reported at the first non-skipped file is shown.
     * - ✅ An error is thrown from skipFiles and caught in user code. In both
     *      blackboxing and this version, the debugger will not pause.
     * - ✅ An error is thrown anywhere in user code. All good.
     *
     * See: https://github.com/microsoft/vscode-js-debug/issues/644
     */
    shouldScriptSkip(evt) {
        var _a;
        return (!((_a = evt.data) === null || _a === void 0 ? void 0 : _a.uncaught) &&
            evt.callFrames.length &&
            this.scriptSkipper.isScriptSkipped(evt.callFrames[0].url));
    }
    /**
     * Parses the breakpoint request into the "PauseOnException" type for easier
     * handling internally.
     */
    parseBreakpointRequest(params) {
        var _a;
        const filters = ((_a = params.filterOptions) !== null && _a !== void 0 ? _a : []).concat(params.filters.map(filterId => ({ filterId })));
        let cdp = "none" /* None */;
        const caughtConditions = [];
        const uncaughtConditions = [];
        for (const { filterId, condition } of filters) {
            if (filterId === "all" /* All */) {
                cdp = "all" /* All */;
                if (condition) {
                    caughtConditions.push(filterId);
                }
            }
            else if (filterId === "uncaught" /* Uncaught */) {
                if (cdp === "none" /* None */) {
                    cdp = "uncaught" /* Uncaught */;
                }
                if (condition) {
                    uncaughtConditions.push(filterId);
                }
            }
        }
        const compile = (condition) => {
            if (condition.length === 0) {
                return undefined;
            }
            const expr = '!!(' +
                filters
                    .map(f => f.condition)
                    .filter(objUtils_1.truthy)
                    .join(') || !!(') +
                ')';
            const err = sourceUtils_1.getSyntaxErrorIn(expr);
            if (err) {
                throw new protocolError_1.ProtocolError(errors_1.invalidBreakPointCondition({ line: 0, condition: expr }, err.message));
            }
            const wrapped = this.breakOnError ? expression_1.wrapBreakCondition(expr) : expr;
            return this.evaluator.prepare(wrapped, { hoist: ['error'] }).invoke;
        };
        if (cdp === "none" /* None */) {
            return { cdp };
        }
        else {
            return {
                cdp,
                condition: { caught: compile(caughtConditions), uncaught: compile(uncaughtConditions) },
            };
        }
    }
};
ExceptionPauseService = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(evaluator_1.IEvaluator)),
    __param(1, inversify_1.inject(scriptSkipper_1.IScriptSkipper)),
    __param(2, inversify_1.inject(connection_1.IDapApi)),
    __param(3, inversify_1.inject(configuration_1.AnyLaunchConfiguration))
], ExceptionPauseService);
exports.ExceptionPauseService = ExceptionPauseService;
//# sourceMappingURL=exceptionPauseService.js.map
//# sourceMappingURL=exceptionPauseService.js.map
