"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapUsingProjection = void 0;
class KeyAndValue {
    constructor(key, value) {
        this.key = key;
        this.value = value;
    }
    toString() {
        return `${this.key}: ${this.value}`;
    }
}
/**
 * A map which uses a projection of the key to compare its elements (This is
 * equivalent to define a custom comparison criteria in other languages)
 */
class MapUsingProjection {
    constructor(projection, initialContents) {
        this.projection = projection;
        this.initialContents = initialContents;
        const entries = Array.from(initialContents || []).map(pair => {
            const projected = this.projection(pair[0]);
            return [projected, new KeyAndValue(pair[0], pair[1])];
        });
        this.projectionToKeyAndValue = new Map(entries);
    }
    clear() {
        this.projectionToKeyAndValue.clear();
    }
    delete(key) {
        const keyProjected = this.projection(key);
        return this.projectionToKeyAndValue.delete(keyProjected);
    }
    forEach(callbackfn, thisArg) {
        this.projectionToKeyAndValue.forEach(keyAndValue => {
            callbackfn.call(thisArg, keyAndValue.value, keyAndValue.key, this);
        }, thisArg);
    }
    get(key) {
        const keyProjected = this.projection(key);
        const value = this.projectionToKeyAndValue.get(keyProjected);
        return value ? value.value : undefined;
    }
    has(key) {
        return this.projectionToKeyAndValue.has(this.projection(key));
    }
    set(key, value) {
        this.projectionToKeyAndValue.set(this.projection(key), new KeyAndValue(key, value));
        return this;
    }
    get size() {
        return this.projectionToKeyAndValue.size;
    }
    *entries() {
        for (const keyAndValue of this.projectionToKeyAndValue.values()) {
            yield [keyAndValue.key, keyAndValue.value];
        }
    }
    *keys() {
        for (const keyAndValue of this.projectionToKeyAndValue.values()) {
            yield keyAndValue.key;
        }
    }
    *values() {
        for (const keyAndValue of this.projectionToKeyAndValue.values()) {
            yield keyAndValue.value;
        }
    }
    [Symbol.iterator]() {
        return this.entries();
    }
    get [Symbol.toStringTag]() {
        return JSON.stringify(Array.from(this.entries()));
    }
    toString() {
        return `MapUsingProjection<${JSON.stringify([...this.entries()])}>`;
    }
}
exports.MapUsingProjection = MapUsingProjection;
//# sourceMappingURL=mapUsingProjection.js.map
//# sourceMappingURL=mapUsingProjection.js.map
