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
exports.StatefulResourceProvider = void 0;
const inversify_1 = require("inversify");
const connection_1 = require("../../cdp/connection");
const disposable_1 = require("../../common/disposable");
const ioc_extras_1 = require("../../ioc-extras");
const basicResourceProvider_1 = require("./basicResourceProvider");
const requestOptionsProvider_1 = require("./requestOptionsProvider");
const resourceProviderState_1 = require("./resourceProviderState");
let StatefulResourceProvider = class StatefulResourceProvider extends basicResourceProvider_1.BasicResourceProvider {
    constructor(fs, state, cdp, options) {
        super(fs, options);
        this.state = state;
        this.disposables = new disposable_1.DisposableList();
        if (cdp) {
            this.disposables.push(this.state.attach(cdp));
        }
    }
    /**
     * @inheritdoc
     */
    dispose() {
        this.disposables.dispose();
    }
    async fetchHttp(url, cancellationToken, headers = {}) {
        const res = await super.fetchHttp(url, cancellationToken, headers);
        if (!res.ok) {
            const updated = await this.state.apply(url, headers);
            if (updated !== headers) {
                return await super.fetchHttp(url, cancellationToken, updated);
            }
        }
        return res;
    }
};
StatefulResourceProvider = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.FS)),
    __param(1, inversify_1.inject(resourceProviderState_1.ResourceProviderState)),
    __param(2, inversify_1.optional()), __param(2, inversify_1.inject(connection_1.ICdpApi)),
    __param(3, inversify_1.optional()), __param(3, inversify_1.inject(requestOptionsProvider_1.IRequestOptionsProvider))
], StatefulResourceProvider);
exports.StatefulResourceProvider = StatefulResourceProvider;
//# sourceMappingURL=statefulResourceProvider.js.map
//# sourceMappingURL=statefulResourceProvider.js.map
