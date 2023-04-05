"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.HrTime = void 0;
const nsPerSecond = 1e9;
/**
 * High-res time wrapper. Needed since process.hrtime.bigint()
 * is not available on Node < 12
 */
class HrTime {
    constructor(value = process.hrtime()) {
        this.value = value;
    }
    get ms() {
        return this.s * 1000;
    }
    get s() {
        return this.value[0] + this.value[1] / nsPerSecond;
    }
    /**
     * Gets the time elapsed since the given time.
     */
    elapsed() {
        return new HrTime().subtract(this);
    }
    /**
     * Subtracts the other time from this time.
     */
    subtract(other) {
        let ns = this.value[1] - other.value[1];
        let s = this.value[0] - other.value[0];
        if (ns < 0) {
            ns += nsPerSecond;
            s--;
        }
        return new HrTime([s, ns]);
    }
}
exports.HrTime = HrTime;
//# sourceMappingURL=hrnow.js.map
//# sourceMappingURL=hrnow.js.map
