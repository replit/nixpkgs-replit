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
exports.NodeAttacherBase = void 0;
const inversify_1 = require("inversify");
const nodeLauncherBase_1 = require("./nodeLauncherBase");
/**
 * Base class that implements common matters for attachment.
 */
let NodeAttacherBase = class NodeAttacherBase extends nodeLauncherBase_1.NodeLauncherBase {
};
NodeAttacherBase = __decorate([
    inversify_1.injectable()
], NodeAttacherBase);
exports.NodeAttacherBase = NodeAttacherBase;
//# sourceMappingURL=nodeAttacherBase.js.map
//# sourceMappingURL=nodeAttacherBase.js.map
