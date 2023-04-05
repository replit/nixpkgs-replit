"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Semver = void 0;
class Semver {
    constructor(major, minor, patch) {
        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }
    static parse(str) {
        const parts = str.split('.').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) {
            throw new SyntaxError(`Input string '${str}' is not a semver`);
        }
        return new Semver(parts[0], parts[1], parts[2]);
    }
    /**
     * Returns the lower of the two semver versions.
     */
    static min(a, b) {
        return a.lt(b) ? a : b;
    }
    /**
     * @returns 0 if the versions are equal, >0 if this is greater than the given
     * semver, or <0 if it's less than the other semver.
     */
    compare(other) {
        return this.major - other.major || this.minor - other.minor || this.patch - other.patch;
    }
    /**
     * @returns true if this version is after the other
     */
    gt(other) {
        return this.compare(other) > 0;
    }
    /**
     * @returns true if this version is after or equal to the other
     */
    gte(other) {
        return this.compare(other) >= 0;
    }
    /**
     * @returns true if this version is before the other
     */
    lt(other) {
        return this.compare(other) < 0;
    }
    /**
     * @returns true if this version is before or equal to the other
     */
    lte(other) {
        return this.compare(other) <= 0;
    }
    /**
     * @inheritdoc
     */
    toString() {
        return `${this.major}.${this.minor}.${this.patch}`;
    }
}
exports.Semver = Semver;
//# sourceMappingURL=semver.js.map
//# sourceMappingURL=semver.js.map
