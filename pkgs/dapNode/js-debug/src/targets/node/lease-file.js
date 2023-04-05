"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaseFile = void 0;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const os_1 = require("os");
const path = __importStar(require("path"));
/**
 * File that stores a lease on the filesystem. Can be validated to ensure
 * that the file is still 'held' by someone.
 */
class LeaseFile {
    constructor() {
        this.disposed = false;
        /**
         * Path of the callback file.
         */
        this.path = path.join(os_1.tmpdir(), `node-debug-callback-${crypto_1.randomBytes(8).toString('hex')}`);
        this.file = fs_1.promises.open(this.path, 'w');
    }
    /**
     * Returns whether the given file path points to a valid lease.
     */
    static isValid(file) {
        try {
            const contents = fs_1.readFileSync(file);
            if (!contents.length) {
                return false;
            }
            return contents.readDoubleBE() > Date.now() - LeaseFile.recencyDeadline;
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Starts keeping the file up to date.
     */
    async startTouchLoop() {
        await this.touch();
        if (!this.disposed) {
            this.updateInterval = setInterval(() => this.touch(), LeaseFile.updateInterval);
        }
    }
    /**
     * Updates the leased file.
     */
    async touch(dateProvider = () => Date.now()) {
        const fd = await this.file;
        const buf = Buffer.alloc(8);
        buf.writeDoubleBE(dateProvider());
        await fd.write(buf, 0, buf.length, 0);
    }
    /**
     * Diposes of the callback file.
     */
    async dispose() {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        try {
            const fd = await this.file;
            await fd.close();
            await fs_1.promises.unlink(this.path);
        }
        catch (_a) {
            // ignored
        }
    }
}
exports.LeaseFile = LeaseFile;
LeaseFile.updateInterval = 1000;
LeaseFile.recencyDeadline = 2000;
//# sourceMappingURL=lease-file.js.map
//# sourceMappingURL=lease-file.js.map
