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
exports.VSCodeExperimentationService = void 0;
const inversify_1 = require("inversify");
const vscode_tas_client_1 = require("vscode-tas-client");
const configuration_1 = require("../configuration");
const ioc_extras_1 = require("../ioc-extras");
const dapTelemetryReporter_1 = require("./dapTelemetryReporter");
const telemetryReporter_1 = require("./telemetryReporter");
let VSCodeExperimentationService = class VSCodeExperimentationService {
    constructor(reporter, context) {
        // todo: will we ever want experimentation in VS proper?
        if (context && reporter instanceof dapTelemetryReporter_1.DapTelemetryReporter) {
            this.service = vscode_tas_client_1.getExperimentationService('ms-vscode.js-debug', configuration_1.packageVersion, configuration_1.isNightly ? vscode_tas_client_1.TargetPopulation.Insiders : vscode_tas_client_1.TargetPopulation.Public, {
                setSharedProperty(name, value) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    reporter.setGlobalMetric(name, value);
                },
                postEvent(eventName, properties) {
                    reporter.pushOutput({
                        category: 'telemetry',
                        output: eventName,
                        data: properties,
                    });
                },
            }, context.globalState);
        }
    }
    /**
     * @inheritdoc
     */
    async getTreatment(name, defaultValue) {
        if (!this.service) {
            return defaultValue;
        }
        try {
            const r = await this.service.getTreatmentVariableAsync('vscode', name, true);
            return r;
        }
        catch (e) {
            return defaultValue;
        }
    }
};
VSCodeExperimentationService = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(telemetryReporter_1.ITelemetryReporter)),
    __param(1, inversify_1.optional()), __param(1, inversify_1.inject(ioc_extras_1.ExtensionContext))
], VSCodeExperimentationService);
exports.VSCodeExperimentationService = VSCodeExperimentationService;
//# sourceMappingURL=vscodeExperimentationService.js.map
//# sourceMappingURL=vscodeExperimentationService.js.map
