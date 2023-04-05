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
exports.BreakpointConditionFactory = exports.IBreakpointConditionFactory = exports.AlwaysBreak = void 0;
const inversify_1 = require("inversify");
const configuration_1 = require("../../../configuration");
const expression_1 = require("./expression");
const hitCount_1 = require("./hitCount");
const logPoint_1 = require("./logPoint");
const simple_1 = require("./simple");
/**
 * Condition that indicates we should always break at the give spot.
 */
exports.AlwaysBreak = new simple_1.SimpleCondition({ line: 0 }, undefined);
exports.IBreakpointConditionFactory = Symbol('IBreakpointConditionFactory');
let BreakpointConditionFactory = class BreakpointConditionFactory {
    constructor(logPointCompiler, launchConfig) {
        this.logPointCompiler = logPointCompiler;
        this.breakOnError = launchConfig.__breakOnConditionalError;
    }
    getConditionFor(params) {
        if (params.condition) {
            return new expression_1.ExpressionCondition(params, params.condition, this.breakOnError);
        }
        if (params.logMessage) {
            return this.logPointCompiler.compile(params, params.logMessage);
        }
        if (params.hitCondition) {
            return hitCount_1.HitCondition.parse(params.hitCondition);
        }
        return exports.AlwaysBreak;
    }
};
BreakpointConditionFactory = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(logPoint_1.LogPointCompiler)),
    __param(1, inversify_1.inject(configuration_1.AnyLaunchConfiguration))
], BreakpointConditionFactory);
exports.BreakpointConditionFactory = BreakpointConditionFactory;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
