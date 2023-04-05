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
exports.JsDebugPortAttributesProvider = void 0;
const inversify_1 = require("inversify");
const vscode_1 = require("vscode");
const portLeaseTracker_1 = require("../adapter/portLeaseTracker");
let JsDebugPortAttributesProvider = class JsDebugPortAttributesProvider {
    constructor(leaseTracker) {
        this.leaseTracker = leaseTracker;
    }
    /**
     * @inheritdoc
     */
    register(context) {
        if (typeof vscode_1.workspace.registerPortAttributesProvider === 'function') {
            context.subscriptions.push(vscode_1.workspace.registerPortAttributesProvider({ portRange: [53000 /* Min */, 54000 /* Max */] }, this));
        }
    }
    /**
     * @inheritdoc
     */
    async providePortAttributes(port) {
        if (await this.leaseTracker.isRegistered(port)) {
            return {
                port,
                autoForwardAction: vscode_1.PortAutoForwardAction.Ignore,
            };
        }
    }
};
JsDebugPortAttributesProvider = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(portLeaseTracker_1.IPortLeaseTracker))
], JsDebugPortAttributesProvider);
exports.JsDebugPortAttributesProvider = JsDebugPortAttributesProvider;
//# sourceMappingURL=portAttributesProvider.js.map
//# sourceMappingURL=portAttributesProvider.js.map
