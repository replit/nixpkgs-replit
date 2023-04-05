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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseConfigurationProvider = void 0;
const inversify_1 = require("inversify");
const vscode = __importStar(require("vscode"));
/**
 * Base configuration provider that handles some resolution around common
 * options and handles errors.
 */
let BaseConfigurationProvider = class BaseConfigurationProvider {
    /**
     * @inheritdoc
     */
    get type() {
        return this.getType();
    }
    /**
     * @inheritdoc
     */
    get triggerKind() {
        return this.getTriggerKind();
    }
    async provideDebugConfigurations(folder, token) {
        try {
            const r = await this.provide(folder, token);
            if (!r) {
                return [];
            }
            return r instanceof Array ? r : [r];
        }
        catch (err) {
            vscode.window.showErrorMessage(err.message, { modal: true });
            return [];
        }
    }
};
BaseConfigurationProvider = __decorate([
    inversify_1.injectable()
], BaseConfigurationProvider);
exports.BaseConfigurationProvider = BaseConfigurationProvider;
//# sourceMappingURL=baseConfigurationProvider.js.map
//# sourceMappingURL=baseConfigurationProvider.js.map
