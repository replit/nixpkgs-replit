"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserPerformanceProvider = void 0;
class BrowserPerformanceProvider {
    constructor() {
        this.didEnable = new WeakSet();
    }
    /**
     * @inheritdoc
     */
    async retrieve(cdp) {
        if (!this.didEnable.has(cdp)) {
            this.didEnable.add(cdp);
            await cdp.Performance.enable({});
        }
        const metrics = await cdp.Performance.getMetrics({});
        if (!metrics) {
            return { error: 'Error in CDP' };
        }
        const obj = {};
        for (const metric of metrics.metrics) {
            obj[metric.name] = metric.value;
        }
        return { metrics: obj };
    }
}
exports.BrowserPerformanceProvider = BrowserPerformanceProvider;
//# sourceMappingURL=browserPerformanceProvider.js.map
//# sourceMappingURL=browserPerformanceProvider.js.map
