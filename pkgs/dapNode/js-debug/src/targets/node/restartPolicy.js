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
exports.RestartPolicyFactory = void 0;
const inversify_1 = require("inversify");
/**
 * Creates restart policies from the configuration.
 */
let RestartPolicyFactory = class RestartPolicyFactory {
    create(config) {
        var _a, _b;
        if (config === false) {
            return new NeverRestartPolicy();
        }
        if (config === true) {
            return new StaticRestartPolicy({ maxAttempts: Infinity, delay: 1000 });
        }
        return new StaticRestartPolicy({
            maxAttempts: (_a = config.maxAttempts) !== null && _a !== void 0 ? _a : Infinity,
            delay: (_b = config.delay) !== null && _b !== void 0 ? _b : 1000,
        });
    }
};
RestartPolicyFactory = __decorate([
    inversify_1.injectable()
], RestartPolicyFactory);
exports.RestartPolicyFactory = RestartPolicyFactory;
/**
 * Restart policy with a static delay.
 * @see https://github.com/microsoft/vscode-pwa/issues/26
 */
class StaticRestartPolicy {
    constructor(options, attempt = 0) {
        this.options = options;
        this.attempt = attempt;
    }
    get delay() {
        return this.options.delay;
    }
    next() {
        return this.attempt === this.options.maxAttempts
            ? undefined
            : new StaticRestartPolicy(this.options, this.attempt + 1);
    }
    reset() {
        return this.attempt ? new StaticRestartPolicy(this.options) : this;
    }
}
class NeverRestartPolicy {
    constructor() {
        this.delay = -1;
    }
    next() {
        return undefined;
    }
    reset() {
        return this;
    }
}
//# sourceMappingURL=restartPolicy.js.map
//# sourceMappingURL=restartPolicy.js.map
