"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.invertMap = exports.upcastPartial = exports.pick = exports.flatten = exports.bisectArray = exports.trailingEdgeThrottle = exports.debounce = exports.memoizeWeak = exports.memoize = exports.once = exports.getCaseInsensitiveProperty = exports.caseInsensitiveMerge = exports.walkObject = exports.sortKeys = exports.filterObject = exports.mapKeys = exports.mapValues = exports.filterValues = exports.assertNever = exports.removeUndefined = exports.removeNulls = exports.truthy = void 0;
exports.truthy = (value) => !!value;
exports.removeNulls = (obj) => filterValues(obj, (v) => v !== null);
exports.removeUndefined = (obj) => filterValues(obj, (v) => v !== undefined);
/**
 * Asserts that the value is never. If this function is reached, it throws.
 */
exports.assertNever = (value, message) => {
    debugger;
    throw new Error(message.replace('{value}', JSON.stringify(value)));
};
function filterValues(obj, predicate) {
    const next = {};
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (predicate(value, key)) {
            next[key] = value;
        }
    }
    return next;
}
exports.filterValues = filterValues;
/**
 * Maps the object values.
 */
function mapValues(obj, generator) {
    const next = {};
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        next[key] = generator(value, key);
    }
    return next;
}
exports.mapValues = mapValues;
/**
 * Maps the object keys.
 */
function mapKeys(obj, generator) {
    const next = {};
    for (const key of Object.keys(obj)) {
        const newKey = generator(key, obj[key]);
        if (newKey !== undefined) {
            next[newKey] = obj[key];
        }
    }
    return next;
}
exports.mapKeys = mapKeys;
/**
 * Filters the object to the key-value pairs where the predicate returns true.
 */
function filterObject(obj, predicate) {
    const next = {};
    for (const key of Object.keys(obj)) {
        if (predicate(key, obj[key])) {
            next[key] = obj[key];
        }
    }
    return next;
}
exports.filterObject = filterObject;
/**
 * Sorts the object keys using the given sorting function.
 */
function sortKeys(obj, sortFn) {
    if (!obj || typeof obj !== 'object' || obj instanceof Array) {
        return obj;
    }
    const next = {};
    for (const key of Object.keys(obj).sort(sortFn)) {
        next[key] = obj[key];
    }
    return next;
}
exports.sortKeys = sortKeys;
/**
 * Recurively walks over the simple object.
 */
// eslint-disable-next-line
function walkObject(obj, visitor) {
    obj = visitor(obj);
    if (obj) {
        if (obj instanceof Array) {
            obj = obj.map(v => walkObject(v, visitor));
        }
        else if (typeof obj === 'object' && obj) {
            for (const key of Object.keys(obj)) {
                obj[key] = walkObject(obj[key], visitor);
            }
        }
    }
    return obj;
}
exports.walkObject = walkObject;
/**
 * Performs a case-insenstive merge of the list of objects.
 */
function caseInsensitiveMerge(...objs) {
    if (objs.length === 0) {
        return {};
    }
    const out = {};
    const caseMapping = Object.create(null); // prototype-free object
    for (const obj of objs) {
        if (!obj) {
            continue;
        }
        for (const key of Object.keys(obj)) {
            const normalized = key.toLowerCase();
            if (caseMapping[normalized]) {
                out[caseMapping[normalized]] = obj[key];
            }
            else {
                caseMapping[normalized] = key;
                out[key] = obj[key];
            }
        }
    }
    return out;
}
exports.caseInsensitiveMerge = caseInsensitiveMerge;
/**
 * Does a case-insensitive lookup on the given object.
 */
function getCaseInsensitiveProperty(obj, prop) {
    if (obj.hasOwnProperty(prop)) {
        return obj[prop]; // fast path
    }
    const normalized = prop.toLowerCase();
    for (const key of Object.keys(obj)) {
        if (key.toLowerCase() === normalized) {
            return obj[key];
        }
    }
    return undefined;
}
exports.getCaseInsensitiveProperty = getCaseInsensitiveProperty;
const unset = Symbol('unset');
/**
 * Wraps a function so that it's called once, and never again, memoizing
 * the result.
 */
function once(fn) {
    let value = unset;
    const onced = (...args) => {
        if (value === unset) {
            onced.value = value = fn(...args);
        }
        return value;
    };
    onced.forget = () => {
        value = unset;
        onced.value = undefined;
    };
    onced.value = undefined;
    return onced;
}
exports.once = once;
/**
 * Memoizes the single-parameter function.
 */
function memoize(fn) {
    const cached = new Map();
    const wrapper = (arg) => {
        if (cached.has(arg)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return cached.get(arg);
        }
        const value = fn(arg);
        cached.set(arg, value);
        return value;
    };
    wrapper.clear = () => cached.clear();
    return wrapper;
}
exports.memoize = memoize;
/**
 * Memoizes the single-parameter function using weak references.
 */
function memoizeWeak(fn) {
    const cached = new WeakMap();
    const wrapper = (arg) => {
        if (cached.has(arg)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return cached.get(arg);
        }
        const value = fn(arg);
        cached.set(arg, value);
        return value;
    };
    return wrapper;
}
exports.memoizeWeak = memoizeWeak;
/**
 * Debounces the function call for an interval.
 */
function debounce(duration, fn) {
    let timeout;
    const debounced = () => {
        if (timeout !== undefined) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            timeout = undefined;
            fn();
        }, duration);
    };
    debounced.clear = () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
    };
    return debounced;
}
exports.debounce = debounce;
/**
 * Throttles the function to be called at most every "duration", delaying the
 * call by the duration on its first invokation.
 */
function trailingEdgeThrottle(duration, fn) {
    let timeout;
    const debounced = () => {
        if (timeout !== undefined) {
            return;
        }
        timeout = setTimeout(() => {
            timeout = undefined;
            fn();
        }, duration);
    };
    debounced.queued = () => !!timeout;
    debounced.clear = () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
    };
    return debounced;
}
exports.trailingEdgeThrottle = trailingEdgeThrottle;
/**
 * Bisets the array by the predicate. The first return value will be the ones
 * in which the predicate returned true, the second where it returned false.
 */
function bisectArray(items, predicate) {
    const a = [];
    const b = [];
    for (const item of items) {
        if (predicate(item)) {
            a.push(item);
        }
        else {
            b.push(item);
        }
    }
    return [a, b];
}
exports.bisectArray = bisectArray;
/**
 * Flattens an array of arrays into a single-dimensional array.
 */
function flatten(items) {
    let out = [];
    for (const list of items) {
        out = out.concat(list);
    }
    return out;
}
exports.flatten = flatten;
/**
 * Picks the subset of keys from the object.
 */
function pick(obj, keys) {
    const partial = {};
    for (const key of keys) {
        partial[key] = obj[key];
    }
    return partial;
}
exports.pick = pick;
exports.upcastPartial = (v) => v;
/**
 * Inverts the keys and values in a map.
 */
function invertMap(map) {
    const result = new Map();
    for (const [key, value] of map) {
        result.set(value, key);
    }
    return result;
}
exports.invertMap = invertMap;
//# sourceMappingURL=objUtils.js.map
//# sourceMappingURL=objUtils.js.map
