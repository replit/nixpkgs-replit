"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseFeatureProvider_1 = require("./BaseFeatureProvider");
/**
 * Feature provider implementation that handles filters.
 */
class FilteredFeatureProvider extends BaseFeatureProvider_1.BaseFeatureProvider {
    constructor(telemetry, filterProviders) {
        super(telemetry);
        this.telemetry = telemetry;
        this.filterProviders = filterProviders;
        this.cachedTelemetryEvents = [];
    }
    getFilters() {
        // We get the filters that will be sent as headers.
        let filters = new Map();
        for (let filter of this.filterProviders) {
            let filterHeaders = filter.getFilters();
            for (let key of filterHeaders.keys()) {
                // Headers can be overridden by custom filters.
                // That's why a check isn't done to see if the header already exists, the value is just set.
                let filterValue = filterHeaders.get(key);
                filters.set(key, filterValue);
            }
        }
        return filters;
    }
    PostEventToTelemetry(headers) {
        /**
         * If these headers have already been posted, we skip from posting them again..
         */
        if (this.cachedTelemetryEvents.includes(headers)) {
            return;
        }
        const jsonHeaders = JSON.stringify(headers);
        this.telemetry.postEvent('report-headers', new Map([['ABExp.headers', jsonHeaders]]));
        /**
         * We cache the flight so we don't post it again.
         */
        this.cachedTelemetryEvents.push(headers);
    }
}
exports.FilteredFeatureProvider = FilteredFeatureProvider;
//# sourceMappingURL=FilteredFeatureProvider.js.map