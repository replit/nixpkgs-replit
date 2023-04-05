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
exports.ExtensionHostConfigurationResolver = void 0;
const fs_1 = require("fs");
const inversify_1 = require("inversify");
const path_1 = require("path");
const configuration_1 = require("../../configuration");
const baseConfigurationResolver_1 = require("./baseConfigurationResolver");
/**
 * Configuration provider for Extension host debugging.
 */
let ExtensionHostConfigurationResolver = class ExtensionHostConfigurationResolver extends baseConfigurationResolver_1.BaseConfigurationResolver {
    async resolveDebugConfigurationAsync(folder, config) {
        if (config.debugWebWorkerHost === undefined) {
            const extensionKind = await getExtensionKind(folder, config);
            config = Object.assign(Object.assign({}, config), { debugWebWorkerHost: extensionKind.length === 1 && extensionKind[0] === 'web' });
        }
        if (config.debugWebWorkerHost) {
            config.outFiles = []; // will have a runtime script offset which invalidates any predictions
        }
        return Promise.resolve(Object.assign(Object.assign({}, configuration_1.extensionHostConfigDefaults), config));
    }
    getType() {
        return "pwa-extensionHost" /* ExtensionHost */;
    }
};
ExtensionHostConfigurationResolver = __decorate([
    inversify_1.injectable()
], ExtensionHostConfigurationResolver);
exports.ExtensionHostConfigurationResolver = ExtensionHostConfigurationResolver;
const devPathArg = '--extensionDevelopmentPath=';
const getExtensionKind = async (folder, config) => {
    var _a, _b, _c, _d;
    const arg = (_a = config.args) === null || _a === void 0 ? void 0 : _a.find(a => a.startsWith(devPathArg));
    if (!arg) {
        return ['workspace'];
    }
    const resolvedFolder = configuration_1.resolveVariableInConfig(arg.slice(devPathArg.length), 'workspaceFolder', (_c = (_b = folder === null || folder === void 0 ? void 0 : folder.uri.fsPath) !== null && _b !== void 0 ? _b : config.__workspaceFolder) !== null && _c !== void 0 ? _c : '');
    let extensionKind;
    try {
        const json = await fs_1.promises.readFile(path_1.join(resolvedFolder, 'package.json'), 'utf-8');
        extensionKind = (_d = JSON.parse(json).extensionKind) !== null && _d !== void 0 ? _d : 'workspace';
    }
    catch (_e) {
        return ['workspace'];
    }
    return extensionKind instanceof Array ? extensionKind : [extensionKind];
};
//# sourceMappingURL=extensionHostConfigurationResolver.js.map
//# sourceMappingURL=extensionHostConfigurationResolver.js.map
