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
exports.PerformanceProviderFactory = exports.IPerformanceProvider = void 0;
const inversify_1 = require("inversify");
const targets_1 = require("../../targets/targets");
const browserPerformanceProvider_1 = require("./browserPerformanceProvider");
const nodePerformanceProvider_1 = require("./nodePerformanceProvider");
exports.IPerformanceProvider = Symbol('IPerformanceProvider');
let PerformanceProviderFactory = class PerformanceProviderFactory {
    constructor(target) {
        this.target = target;
    }
    create() {
        return this.target.type() === 'node'
            ? new nodePerformanceProvider_1.NodePerformanceProvider()
            : new browserPerformanceProvider_1.BrowserPerformanceProvider();
    }
};
PerformanceProviderFactory = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(targets_1.ITarget))
], PerformanceProviderFactory);
exports.PerformanceProviderFactory = PerformanceProviderFactory;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
