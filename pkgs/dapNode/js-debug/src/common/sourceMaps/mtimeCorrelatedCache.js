"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorrelatedCache = void 0;
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
const fs_1 = require("fs");
const path_1 = require("path");
const objUtils_1 = require("../objUtils");
const fsUtils_1 = require("../fsUtils");
class CorrelatedCache {
    constructor(storageFile, debounceTime = 500) {
        this.storageFile = storageFile;
        this.debounceTime = debounceTime;
        /**
         * Scheules the cache to flush to disk.
         */
        this.flush = objUtils_1.debounce(this.debounceTime, () => this.flushImmediately());
        try {
            fs_1.mkdirSync(path_1.dirname(storageFile));
        }
        catch (_a) {
            // ignored
        }
    }
    /**
     * Gets the value from the map if it exists and the correlation matches.
     */
    async lookup(key, correlation) {
        const data = await this.getData();
        const entry = data[key];
        return entry && entry.correlation === correlation ? entry.value : undefined;
    }
    /**
     * Stores the value in the cache.
     */
    async store(key, correlation, value) {
        const data = await this.getData();
        data[key] = { correlation, value };
        this.flush();
    }
    /**
     * Flushes the cache to disk immediately.
     */
    async flushImmediately() {
        this.flush.clear();
        return fsUtils_1.writeFile(this.storageFile, JSON.stringify(await this.getData()));
    }
    /**
     * @inheritdoc
     */
    dispose() {
        this.flushImmediately();
    }
    getData() {
        if (!this.cacheData) {
            this.cacheData = this.hydrateFromDisk();
        }
        return this.cacheData;
    }
    async hydrateFromDisk() {
        try {
            return JSON.parse(await fsUtils_1.readfile(this.storageFile)) || {};
        }
        catch (e) {
            return {};
        }
    }
}
exports.CorrelatedCache = CorrelatedCache;
//# sourceMappingURL=mtimeCorrelatedCache.js.map
//# sourceMappingURL=mtimeCorrelatedCache.js.map
