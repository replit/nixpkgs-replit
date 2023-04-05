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
exports.ChromeDebugConfigurationProvider = exports.ChromeDebugConfigurationResolver = void 0;
const configuration_1 = require("../../configuration");
const chromiumDebugConfigurationProvider_1 = require("./chromiumDebugConfigurationProvider");
const inversify_1 = require("inversify");
/**
 * Configuration provider for Chrome debugging.
 */
let ChromeDebugConfigurationResolver = class ChromeDebugConfigurationResolver extends chromiumDebugConfigurationProvider_1.ChromiumDebugConfigurationResolver {
    /**
     * @override
     */
    async resolveDebugConfigurationAsync(folder, config) {
        if (!config.name && !config.type && !config.request) {
            const fromContext = new ChromeDebugConfigurationProvider().createLaunchConfigFromContext();
            if (!fromContext) {
                // Return null so it will create a launch.json and fall back on
                // provideDebugConfigurations - better to point the user towards
                // the config than try to work automagically for complex scenarios.
                return null;
            }
            config = fromContext;
        }
        await this.resolveBrowserCommon(folder, config);
        return config.request === 'attach'
            ? Object.assign(Object.assign({}, configuration_1.chromeAttachConfigDefaults), config) : Object.assign(Object.assign({}, configuration_1.chromeLaunchConfigDefaults), config);
    }
    getType() {
        return "pwa-chrome" /* Chrome */;
    }
};
ChromeDebugConfigurationResolver = __decorate([
    inversify_1.injectable()
], ChromeDebugConfigurationResolver);
exports.ChromeDebugConfigurationResolver = ChromeDebugConfigurationResolver;
let ChromeDebugConfigurationProvider = class ChromeDebugConfigurationProvider extends chromiumDebugConfigurationProvider_1.ChromiumDebugConfigurationProvider {
    getType() {
        return "pwa-chrome" /* Chrome */;
    }
};
ChromeDebugConfigurationProvider = __decorate([
    inversify_1.injectable()
], ChromeDebugConfigurationProvider);
exports.ChromeDebugConfigurationProvider = ChromeDebugConfigurationProvider;
//# sourceMappingURL=chromeDebugConfigurationProvider.js.map
//# sourceMappingURL=chromeDebugConfigurationProvider.js.map
