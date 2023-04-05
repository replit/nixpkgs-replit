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
exports.StartDebugingAndStopOnEntry = void 0;
const inversify_1 = require("inversify");
const vscode_1 = require("vscode");
const contributionUtils_1 = require("../common/contributionUtils");
let StartDebugingAndStopOnEntry = class StartDebugingAndStopOnEntry {
    register(context) {
        context.subscriptions.push(contributionUtils_1.registerCommand(vscode_1.commands, "extension.node-debug.startWithStopOnEntry" /* StartWithStopOnEntry */, () => vscode_1.commands.executeCommand('workbench.action.debug.start', {
            config: {
                stopOnEntry: true,
            },
        })));
    }
};
StartDebugingAndStopOnEntry = __decorate([
    inversify_1.injectable()
], StartDebugingAndStopOnEntry);
exports.StartDebugingAndStopOnEntry = StartDebugingAndStopOnEntry;
//# sourceMappingURL=startDebuggingAndStopOnEntry.js.map
//# sourceMappingURL=startDebuggingAndStopOnEntry.js.map