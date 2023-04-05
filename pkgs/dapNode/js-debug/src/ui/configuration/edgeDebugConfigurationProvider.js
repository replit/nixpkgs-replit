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
exports.EdgeDebugConfigurationProvider = exports.EdgeDebugConfigurationResolver = void 0;
const configuration_1 = require("../../configuration");
const chromiumDebugConfigurationProvider_1 = require("./chromiumDebugConfigurationProvider");
const inversify_1 = require("inversify");
/**
 * Configuration provider for Chrome debugging.
 */
let EdgeDebugConfigurationResolver = class EdgeDebugConfigurationResolver extends chromiumDebugConfigurationProvider_1.ChromiumDebugConfigurationResolver {
    /**
     * @override
     */
    async resolveDebugConfigurationAsync(folder, config) {
        var _a;
        if (!config.name && !config.type && !config.request) {
            const fromContext = new EdgeDebugConfigurationProvider().createLaunchConfigFromContext();
            if (!fromContext) {
                // Return null so it will create a launch.json and fall back on
                // provideDebugConfigurations - better to point the user towards
                // the config than try to work automagically for complex scenarios.
                return;
            }
            config = fromContext;
        }
        await this.resolveBrowserCommon(folder, config);
        // Disable attachment timeouts for webview apps. We aren't opening a
        // browser immediately, and it may take an arbitrary amount of time within
        // the app until a debuggable webview appears.
        if (config.useWebView) {
            config.timeout = (_a = config.timeout) !== null && _a !== void 0 ? _a : 0;
        }
        return config.request === 'attach'
            ? Object.assign(Object.assign({}, configuration_1.edgeAttachConfigDefaults), config) : Object.assign(Object.assign({}, configuration_1.edgeLaunchConfigDefaults), config);
    }
    getType() {
        return "pwa-msedge" /* Edge */;
    }
};
EdgeDebugConfigurationResolver = __decorate([
    inversify_1.injectable()
], EdgeDebugConfigurationResolver);
exports.EdgeDebugConfigurationResolver = EdgeDebugConfigurationResolver;
let EdgeDebugConfigurationProvider = class EdgeDebugConfigurationProvider extends chromiumDebugConfigurationProvider_1.ChromiumDebugConfigurationProvider {
    getType() {
        return "pwa-msedge" /* Edge */;
    }
};
EdgeDebugConfigurationProvider = __decorate([
    inversify_1.injectable()
], EdgeDebugConfigurationProvider);
exports.EdgeDebugConfigurationProvider = EdgeDebugConfigurationProvider;
//# sourceMappingURL=edgeDebugConfigurationProvider.js.map
//# sourceMappingURL=edgeDebugConfigurationProvider.js.map
