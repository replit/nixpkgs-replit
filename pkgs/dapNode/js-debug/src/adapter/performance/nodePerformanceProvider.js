"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodePerformanceProvider = void 0;
const templates_1 = require("../templates");
class NodePerformanceProvider {
    /**
     * @inheritdoc
     */
    async retrieve(cdp) {
        const res = await cdp.Runtime.evaluate({
            expression: `({
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        timestamp: Date.now(),
        resourceUsage: process.resourceUsage && process.resourceUsage(),
      })${templates_1.getSourceSuffix()}`,
            returnByValue: true,
        });
        if (!res) {
            return { error: 'No response from CDP' };
        }
        if (res.exceptionDetails) {
            return { error: res.exceptionDetails.text };
        }
        return { metrics: res.result.value };
    }
}
exports.NodePerformanceProvider = NodePerformanceProvider;
//# sourceMappingURL=nodePerformanceProvider.js.map
//# sourceMappingURL=nodePerformanceProvider.js.map
