"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserArgs = void 0;
const objUtils_1 = require("../../common/objUtils");
const debugPortArg = '--remote-debugging-port';
const debugPipeArg = '--remote-debugging-pipe';
const argsToMap = (args) => {
    const map = {};
    for (const arg of args) {
        const delimiter = arg.indexOf('=');
        if (delimiter === -1) {
            map[arg] = null;
        }
        else {
            map[arg.slice(0, delimiter)] = arg.slice(delimiter + 1);
        }
    }
    return map;
};
const mapToArgs = (map) => {
    const out = [];
    for (const key of Object.keys(map)) {
        const value = map[key];
        if (value === undefined) {
            continue;
        }
        out.push(value === null ? key : `${key}=${value}`);
    }
    return out;
};
/**
 * Type used for managing the list of arguments passed to the browser.
 */
class BrowserArgs {
    constructor(args = []) {
        this.args = args;
        this.argMap = objUtils_1.once(() => argsToMap(this.args));
    }
    /**
     * Adds or overwrites an argument.
     */
    add(key, value = null) {
        return new BrowserArgs(mapToArgs(Object.assign(Object.assign({}, this.argMap()), { [key]: value })));
    }
    /**
     * Removes an argument.
     */
    remove(key) {
        return new BrowserArgs(mapToArgs(Object.assign(Object.assign({}, this.argMap()), { [key]: undefined })));
    }
    /**
     * Merges the set of arguments into this one.
     */
    merge(args) {
        return new BrowserArgs(mapToArgs(Object.assign(Object.assign({}, this.argMap()), (args instanceof BrowserArgs ? args.argMap() : argsToMap(args)))));
    }
    /**
     * Sets the connection the browser args, returning an updated list of args.
     */
    setConnection(connection) {
        return new BrowserArgs(mapToArgs(Object.assign(Object.assign({}, this.argMap()), { [debugPipeArg]: connection === 'pipe' ? null : undefined, [debugPortArg]: connection !== 'pipe' ? String(connection) : undefined })));
    }
    /**
     * Gets the preferred connection for this browser based on the arguments.
     */
    getSuggestedConnection() {
        const args = this.argMap();
        if (args.hasOwnProperty(debugPipeArg)) {
            return 'pipe';
        }
        const port = args[debugPortArg];
        if (port === undefined) {
            return undefined;
        }
        return (port && Number(port)) || 0;
    }
    /**
     * Returns a new set of browser args that pass the predicate.
     */
    filter(predicate) {
        const args = this.argMap();
        const out = [];
        for (const key of Object.keys(args)) {
            const value = args[key];
            if (!predicate(key, value)) {
                continue;
            }
            out.push(value === null ? key : `${key}=${value}`);
        }
        return new BrowserArgs(out);
    }
    /**
     * Gets the array of arguments.
     */
    toArray() {
        return this.args.slice();
    }
}
exports.BrowserArgs = BrowserArgs;
/**
 * Chrome default arguments.
 */
BrowserArgs.default = new BrowserArgs([
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-client-side-phishing-detection',
    '--disable-default-apps',
    '--disable-dev-shm-usage',
    '--disable-renderer-backgrounding',
    '--disable-sync',
    '--metrics-recording-only',
    '--no-first-run',
    '--no-default-browser-check',
]);
//# sourceMappingURL=browserArgs.js.map
//# sourceMappingURL=browserArgs.js.map
