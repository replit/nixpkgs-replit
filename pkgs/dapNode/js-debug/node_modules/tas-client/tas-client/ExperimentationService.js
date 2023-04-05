"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TasApiFeatureProvider_1 = require("./FeatureProvider/TasApiFeatureProvider");
const AxiosHttpClient_1 = require("./Util/AxiosHttpClient");
const ExperimentationServiceAutoPolling_1 = require("./ExperimentationServiceAutoPolling");
/**
 * Experimentation service to provide functionality of A/B experiments:
 * - reading flights;
 * - caching current set of flights;
 * - get answer on if flights are enabled.
 */
class ExperimentationService extends ExperimentationServiceAutoPolling_1.ExperimentationServiceAutoPolling {
    constructor(options) {
        super(options.telemetry, options.filterProviders || [], // Defaulted to empty array.
        options.refetchInterval != null
            ? options.refetchInterval
            : // If no fetch interval is provided, refetch functionality is turned off.
                0, options.featuresTelemetryPropertyName, options.assignmentContextTelemetryPropertyName, options.telemetryEventName, options.storageKey, options.keyValueStorage);
        this.options = options;
        this.invokeInit();
    }
    init() {
        // set feature providers to be an empty array.
        this.featureProviders = [];
        // Add WebApi feature provider.
        this.addFeatureProvider(new TasApiFeatureProvider_1.TasApiFeatureProvider(new AxiosHttpClient_1.AxiosHttpClient(this.options.endpoint), this.telemetry, this.filterProviders));
        // This will start polling the TAS.
        super.init();
    }
}
exports.ExperimentationService = ExperimentationService;
ExperimentationService.REFRESH_RATE_IN_MINUTES = 30;
//# sourceMappingURL=ExperimentationService.js.map