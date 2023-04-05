"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Abstract class for Feature Provider Implementation.
 */
class BaseFeatureProvider {
    /**
     * @param telemetry The telemetry implementation.
     */
    constructor(telemetry) {
        this.telemetry = telemetry;
        this.isFetching = false;
    }
    /**
     * Method that wraps the fetch method in order to re-use the fetch promise if needed.
     * @param headers The headers to be used on the fetch method.
     */
    async getFeatures() {
        if (this.isFetching && this.fetchPromise) {
            return this.fetchPromise;
        }
        this.fetchPromise = this.fetch();
        let features = await this.fetchPromise;
        this.isFetching = false;
        this.fetchPromise = undefined;
        return features;
    }
}
exports.BaseFeatureProvider = BaseFeatureProvider;
//# sourceMappingURL=BaseFeatureProvider.js.map