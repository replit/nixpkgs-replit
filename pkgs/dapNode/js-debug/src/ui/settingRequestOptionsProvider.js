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
exports.SettingRequestOptionsProvider = void 0;
const inversify_1 = require("inversify");
const vscode_1 = require("vscode");
const helpers_1 = require("../adapter/resourceProvider/helpers");
const contributionUtils_1 = require("../common/contributionUtils");
const objUtils_1 = require("../common/objUtils");
let SettingRequestOptionsProvider = class SettingRequestOptionsProvider {
    constructor() {
        this.read = objUtils_1.once(() => contributionUtils_1.readConfig(vscode_1.workspace, "debug.javascript.resourceRequestOptions" /* ResourceRequestOptions */));
    }
    /**
     * @inheritdoc
     */
    provideOptions(obj) {
        helpers_1.mergeOptions(obj, (this.read() || {}));
    }
};
SettingRequestOptionsProvider = __decorate([
    inversify_1.injectable()
], SettingRequestOptionsProvider);
exports.SettingRequestOptionsProvider = SettingRequestOptionsProvider;
//# sourceMappingURL=settingRequestOptionsProvider.js.map
//# sourceMappingURL=settingRequestOptionsProvider.js.map
