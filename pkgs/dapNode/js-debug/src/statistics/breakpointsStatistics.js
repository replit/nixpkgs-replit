"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreakpointsStatisticsCalculator = void 0;
class BreakpointStatistic {
    constructor(verified = false, hit = false) {
        this.verified = verified;
        this.hit = hit;
    }
}
class BreakpointsStatisticsCalculator {
    constructor() {
        this._statisticsById = new Map();
    }
    registerBreakpoints(manyBreakpoints) {
        manyBreakpoints.forEach(breakpoint => {
            breakpoint.id !== undefined &&
                !this._statisticsById.has(breakpoint.id) &&
                this._statisticsById.set(breakpoint.id, new BreakpointStatistic(breakpoint.verified, false));
        });
    }
    registerResolvedBreakpoint(breakpointId) {
        this.getStatistics(breakpointId).verified = true;
    }
    registerBreakpointHit(breakpointId) {
        this.getStatistics(breakpointId).hit = true;
    }
    getStatistics(breakpointId) {
        const statistic = this._statisticsById.get(breakpointId);
        if (statistic !== undefined) {
            return statistic;
        }
        else {
            const newStatistic = new BreakpointStatistic();
            this._statisticsById.set(breakpointId, newStatistic);
            return newStatistic;
        }
    }
    statistics() {
        let count = 0;
        let verified = 0;
        let hit = 0;
        for (const singleStatistic of this._statisticsById.values()) {
            count++;
            if (singleStatistic.hit)
                hit++;
            if (singleStatistic.verified)
                verified++;
        }
        return { set: count, verified, hit };
    }
}
exports.BreakpointsStatisticsCalculator = BreakpointsStatisticsCalculator;
//# sourceMappingURL=breakpointsStatistics.js.map
//# sourceMappingURL=breakpointsStatistics.js.map
