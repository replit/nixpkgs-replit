"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileLogSink = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const zlib_1 = require("zlib");
const replacer = (_key, value) => {
    if (value instanceof Error) {
        return {
            message: value.message,
            stack: value.stack,
        };
    }
    if (typeof value === 'bigint') {
        return value.toString();
    }
    return value;
};
/**
 * A log sink that writes to a file.
 */
class FileLogSink {
    constructor(file, dap) {
        this.file = file;
        this.dap = dap;
        try {
            fs_1.mkdirSync(path_1.dirname(file), { recursive: true });
        }
        catch (_a) {
            // already exists
        }
        if (file.endsWith('.gz')) {
            this.stream = zlib_1.createGzip();
            this.stream.pipe(fs_1.createWriteStream(file));
        }
        else {
            this.stream = fs_1.createWriteStream(file);
        }
    }
    /**
     * @inheritdoc
     */
    async setup() {
        var _a;
        (_a = this.dap) === null || _a === void 0 ? void 0 : _a.output({
            category: 'console',
            output: `Verbose logs are written to:\n${this.file}\n`,
        });
    }
    /**
     * @inheritdoc
     */
    dispose() {
        if (this.stream) {
            this.stream.end();
            this.stream = undefined;
        }
    }
    /**
     * @inheritdoc
     */
    write(item) {
        var _a, _b;
        if (this.stream) {
            this.stream.write(JSON.stringify(item, replacer) + '\n');
            (_b = (_a = this.stream).flush) === null || _b === void 0 ? void 0 : _b.call(_a, zlib_1.constants.Z_SYNC_FLUSH);
        }
    }
}
exports.FileLogSink = FileLogSink;
//# sourceMappingURL=fileLogSink.js.map
//# sourceMappingURL=fileLogSink.js.map
