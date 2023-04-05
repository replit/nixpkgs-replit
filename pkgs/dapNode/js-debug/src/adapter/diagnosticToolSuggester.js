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
var DiagnosticToolSuggester_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticToolSuggester = void 0;
const inversify_1 = require("inversify");
const disposable_1 = require("../common/disposable");
const events_1 = require("../common/events");
const promiseUtil_1 = require("../common/promiseUtil");
const connection_1 = require("../dap/connection");
const experimentationService_1 = require("../telemetry/experimentationService");
const telemetryReporter_1 = require("../telemetry/telemetryReporter");
const ignoredModulePatterns = /\/node_modules\/|^node\:/;
const consecutiveSessions = 2;
const suggestDelay = 5000;
const minDuration = suggestDelay / 2;
/**
 * Fires an event to indicate to the UI that it should suggest the user open
 * the diagnostic tool. The indicator will be shown when all of the following
 * are true:
 *
 * - At least one breakpoint was set, but no breakpoints bound,
 * - For two consecutive debug sessions,
 * - Where a sourcemap was used for a script outside of the node_modules, or
 *   a remoteRoot is present (since sourcemaps and remote are the cases where
 *   almost all path resolution issues happen)
 */
let DiagnosticToolSuggester = DiagnosticToolSuggester_1 = class DiagnosticToolSuggester {
    constructor(dap, telemetry, experimentation) {
        this.telemetry = telemetry;
        this.experimentation = experimentation;
        this.disposable = new disposable_1.DisposableList();
        this.hadBreakpoint = false;
        this.didVerifyBreakpoint = false;
        this.hadNonModuleSourcemap = false;
        this.startedAt = Date.now();
        this.disposable.push(DiagnosticToolSuggester_1.didVerifyEmitter.event(() => {
            this.didVerifyBreakpoint = true;
        }));
        if (DiagnosticToolSuggester_1.consecutiveQualifyingSessions >= consecutiveSessions) {
            this.disposable.push(promiseUtil_1.disposableTimeout(async () => {
                if (!this.currentlyQualifying) {
                    return;
                }
                if (!(await this.experimentation.getTreatment('diagnosticPrompt', true))) {
                    return;
                }
                telemetry.report('diagnosticPrompt', { event: 'suggested' });
                DiagnosticToolSuggester_1.didSuggest = true;
                dap.suggestDiagnosticTool({});
            }, suggestDelay));
        }
    }
    get currentlyQualifying() {
        return this.hadBreakpoint && !this.didVerifyBreakpoint && this.hadNonModuleSourcemap;
    }
    notifyHadBreakpoint() {
        this.hadBreakpoint = true;
    }
    notifyVerifiedBreakpoint() {
        if (this.didVerifyBreakpoint) {
            return;
        }
        DiagnosticToolSuggester_1.didVerifyEmitter.fire();
        if (DiagnosticToolSuggester_1.didSuggest) {
            DiagnosticToolSuggester_1.didSuggest = false;
            this.telemetry.report('diagnosticPrompt', { event: 'resolved' });
        }
    }
    /**
     * Attaches the CDP API. Should be called for each
     */
    attach(cdp) {
        if (!this.hadNonModuleSourcemap) {
            const listener = this.disposable.push(cdp.Debugger.on('scriptParsed', evt => {
                if (!!evt.sourceMapURL && !ignoredModulePatterns.test(evt.url)) {
                    this.hadNonModuleSourcemap = true;
                    this.disposable.disposeObject(listener);
                }
            }));
        }
    }
    /**
     * Should be called before the root debug session ends. It'll fire a DAP
     * message to show a notification if appropriate.
     */
    dispose() {
        if (this.currentlyQualifying && Date.now() - minDuration > this.startedAt) {
            DiagnosticToolSuggester_1.consecutiveQualifyingSessions++;
        }
        else {
            DiagnosticToolSuggester_1.consecutiveQualifyingSessions = 0;
        }
        this.disposable.dispose();
    }
};
/**
 * Number of sessions that qualify for help. The DiagnosticToolSuggester is
 * a global singleton and we don't care about persistence, so this is fine.
 */
DiagnosticToolSuggester.consecutiveQualifyingSessions = 0;
/**
 * Fired when a disqualifying event happens. This is global, since in a
 * compound launch config many sessions might be launched but only one of
 * them could end up qualifying.
 */
DiagnosticToolSuggester.didVerifyEmitter = new events_1.EventEmitter();
/**
 * Whether we recently suggested using the diagnostic tool.
 */
DiagnosticToolSuggester.didSuggest = false;
DiagnosticToolSuggester = DiagnosticToolSuggester_1 = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(connection_1.IRootDapApi)),
    __param(1, inversify_1.inject(telemetryReporter_1.ITelemetryReporter)),
    __param(2, inversify_1.inject(experimentationService_1.IExperimentationService))
], DiagnosticToolSuggester);
exports.DiagnosticToolSuggester = DiagnosticToolSuggester;
//# sourceMappingURL=diagnosticToolSuggester.js.map
//# sourceMappingURL=diagnosticToolSuggester.js.map
