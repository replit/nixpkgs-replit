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
var ProfilerFactory_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfilerFactory = exports.IProfilerFactory = void 0;
const basicCpuProfiler_1 = require("./basicCpuProfiler");
const inversify_1 = require("inversify");
const ioc_extras_1 = require("../../ioc-extras");
exports.IProfilerFactory = Symbol('IProfilerFactory');
/**
 * Simple class that gets profilers
 */
let ProfilerFactory = ProfilerFactory_1 = class ProfilerFactory {
    constructor(container) {
        this.container = container;
    }
    get(type) {
        const ctor = ProfilerFactory_1.ctors.find(p => p.type === type);
        if (!ctor) {
            throw new Error(`Invalid profilter type ${type}`);
        }
        return this.container.get(ctor);
    }
};
ProfilerFactory.ctors = [basicCpuProfiler_1.BasicCpuProfiler];
ProfilerFactory = ProfilerFactory_1 = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.IContainer))
], ProfilerFactory);
exports.ProfilerFactory = ProfilerFactory;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
