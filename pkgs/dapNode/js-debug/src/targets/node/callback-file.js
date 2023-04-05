"use strict";
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
exports.CallbackFile = void 0;
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
const os_1 = require("os");
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const fs_1 = require("fs");
/**
 * File written by the bootloader containing some process information.
 */
class CallbackFile {
    constructor() {
        /**
         * Path of the callback file.
         */
        this.path = path.join(os_1.tmpdir(), `node-debug-callback-${crypto_1.randomBytes(8).toString('hex')}`);
        this.disposed = false;
    }
    /**
     * Reads the file, returnings its contants after they're written, or returns
     * undefined if the file was disposed of before the read completed.
     */
    read(pollInterval = CallbackFile.pollInterval) {
        if (this.readPromise) {
            return this.readPromise;
        }
        this.readPromise = new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                if (this.disposed) {
                    clearInterval(interval);
                    resolve(undefined);
                    return;
                }
                if (!fs_1.existsSync(this.path)) {
                    return;
                }
                try {
                    resolve(JSON.parse(fs_1.readFileSync(this.path, 'utf-8')));
                }
                catch (e) {
                    reject(e);
                }
                finally {
                    this.dispose();
                }
                clearInterval(interval);
            }, pollInterval);
        });
        return this.readPromise;
    }
    /**
     * Diposes of the callback file.
     */
    dispose() {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        try {
            fs_1.unlinkSync(this.path);
        }
        catch (_a) {
            // ignored
        }
    }
}
exports.CallbackFile = CallbackFile;
CallbackFile.pollInterval = 200;
//# sourceMappingURL=callback-file.js.map
//# sourceMappingURL=callback-file.js.map
