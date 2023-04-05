"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ExperimentationServiceBase_1 = require("./ExperimentationServiceBase");
const PollingService_1 = require("./Util/PollingService");
/**
 * Implementation of Feature provider that provides a polling feature, where the source can be re-fetched every x time given.
 */
class ExperimentationServiceAutoPolling extends ExperimentationServiceBase_1.ExperimentationServiceBase {
    constructor(telemetry, filterProviders, refreshRateMs, featuresTelemetryPropertyName, assignmentContextTelemetryPropertyName, telemetryEventName, storageKey, storage) {
        super(telemetry, featuresTelemetryPropertyName, assignmentContextTelemetryPropertyName, telemetryEventName, storageKey, storage);
        this.telemetry = telemetry;
        this.filterProviders = filterProviders;
        this.refreshRateMs = refreshRateMs;
        this.featuresTelemetryPropertyName = featuresTelemetryPropertyName;
        this.assignmentContextTelemetryPropertyName = assignmentContextTelemetryPropertyName;
        this.telemetryEventName = telemetryEventName;
        this.storageKey = storageKey;
        this.storage = storage;
        // Excluding 0 since it allows to turn off the auto polling.
        if (refreshRateMs < 1000 && refreshRateMs !== 0) {
            throw new Error('The minimum refresh rate for polling is 1000 ms (1 second). If you wish to deactivate this auto-polling use value of 0.');
        }
        if (refreshRateMs > 0) {
            this.pollingService = new PollingService_1.PollingService(refreshRateMs);
            this.pollingService.OnPollTick(async () => {
                await super.getFeaturesAsync();
            });
        }
    }
    init() {
        if (this.pollingService) {
            this.pollingService.StartPolling(true);
        }
        else {
            super.getFeaturesAsync();
        }
    }
    /**
     * Wrapper that will reset the polling intervals whenever the feature data is fetched manually.
     */
    async getFeaturesAsync(overrideInMemoryFeatures = false) {
        if (!this.pollingService) {
            return await super.getFeaturesAsync(overrideInMemoryFeatures);
        }
        else {
            this.pollingService.StopPolling();
            let result = await super.getFeaturesAsync(overrideInMemoryFeatures);
            this.pollingService.StartPolling();
            return result;
        }
    }
}
exports.ExperimentationServiceAutoPolling = ExperimentationServiceAutoPolling;
//# sourceMappingURL=ExperimentationServiceAutoPolling.js.map