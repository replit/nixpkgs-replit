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
exports.DurationTerminationConditionFactory = void 0;
const nls = __importStar(require("vscode-nls"));
const vscode = __importStar(require("vscode"));
const inversify_1 = require("inversify");
const disposable_1 = require("../../common/disposable");
const localize = nls.loadMessageBundle();
let DurationTerminationConditionFactory = class DurationTerminationConditionFactory {
    constructor() {
        this.sortOrder = 1;
        this.id = 'duration';
        this.label = localize('profile.termination.duration.label', 'Duration');
        this.description = localize('profile.termination.duration.description', 'Run for a specific amount of time');
    }
    async onPick(_session, duration) {
        if (duration) {
            return new DurationTerminationCondition(duration * 1000);
        }
        const input = vscode.window.createInputBox();
        input.title = localize('profile.termination.duration.inputTitle', 'Duration of Profile');
        input.placeholder = localize('profile.termination.duration.placeholder', 'Profile duration in seconds, e.g "5"');
        if (this.lastDuration) {
            input.value = String(this.lastDuration);
        }
        input.onDidChangeValue(value => {
            if (!/^[0-9]+$/.test(value)) {
                input.validationMessage = localize('profile.termination.duration.invalidFormat', 'Please enter a number');
            }
            else if (Number(value) < 1) {
                input.validationMessage = localize('profile.termination.duration.invalidLength', 'Please enter a number greater than 1');
            }
            else {
                input.validationMessage = undefined;
            }
        });
        const condition = await new Promise(resolve => {
            input.onDidAccept(() => {
                if (input.validationMessage) {
                    return resolve(undefined);
                }
                this.lastDuration = Number(input.value);
                resolve(new DurationTerminationCondition(this.lastDuration * 1000));
            });
            input.onDidHide(() => resolve());
            input.show();
        });
        input.dispose();
        return condition;
    }
};
DurationTerminationConditionFactory = __decorate([
    inversify_1.injectable()
], DurationTerminationConditionFactory);
exports.DurationTerminationConditionFactory = DurationTerminationConditionFactory;
class DurationTerminationCondition {
    constructor(duration) {
        this.duration = duration;
        this.disposable = new disposable_1.DisposableList();
    }
    attachTo(session) {
        const deadline = Date.now() + this.duration;
        const updateTimer = () => session.setStatus(1 /* TerminationTimer */, `${Math.round((deadline - Date.now()) / 1000)}s`);
        const stopTimeout = setTimeout(() => session.stop(), this.duration);
        const updateInterval = setInterval(updateTimer, 1000);
        updateTimer();
        this.disposable.callback(() => {
            clearTimeout(stopTimeout);
            clearInterval(updateInterval);
        });
    }
    dispose() {
        this.disposable.dispose();
    }
}
//# sourceMappingURL=durationTerminationCondition.js.map
//# sourceMappingURL=durationTerminationCondition.js.map
