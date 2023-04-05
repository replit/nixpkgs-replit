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
exports.ResourceProviderState = void 0;
const inversify_1 = require("inversify");
const helpers_1 = require("./helpers");
/**
 * Provides state shared between all IResourceProviders.
 */
let ResourceProviderState = class ResourceProviderState {
    constructor() {
        this.cdp = [];
    }
    /**
     * Listens to the CDP API, monitoring requests.
     */
    attach(cdp) {
        this.cdp.push({ cdp, enabledNetwork: false });
        return {
            dispose: () => {
                this.cdp = this.cdp.filter(c => c.cdp !== cdp);
            },
        };
    }
    /**
     * Applies state overrides to the request options.
     */
    async apply(url, headers) {
        const cdp = this.cdp[0];
        if (cdp) {
            headers = await this.applyCookies(cdp, url, headers);
        }
        // Todo: are schemes such as HTTP Basic Auth something we'd like to support here?
        return headers;
    }
    async applyCookies(c, url, headers) {
        var _a;
        if (!c.enabledNetwork) {
            c.enabledNetwork = true;
            await c.cdp.Network.enable({});
        }
        const cookies = await c.cdp.Network.getCookies({ urls: [url] });
        if (!((_a = cookies === null || cookies === void 0 ? void 0 : cookies.cookies) === null || _a === void 0 ? void 0 : _a.length)) {
            return headers;
        }
        return helpers_1.addHeader(headers, 'Cookie', cookies.cookies
            // By spec, cookies with shorter paths should be sorted before longer ones
            .sort((a, b) => a.path.length - b.path.length)
            // Cookies cannot have = in their keys or ; in their values, no escaping needed
            .map(c => `${c.name}=${c.value}`)
            .join('; '));
    }
};
ResourceProviderState = __decorate([
    inversify_1.injectable()
], ResourceProviderState);
exports.ResourceProviderState = ResourceProviderState;
//# sourceMappingURL=resourceProviderState.js.map
//# sourceMappingURL=resourceProviderState.js.map
