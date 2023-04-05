"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseProcessTree = void 0;
const child_process_1 = require("child_process");
const split2_1 = __importDefault(require("split2"));
/**
 * Base process tree that others can extend.
 */
class BaseProcessTree {
    constructor(spawn = child_process_1.spawn) {
        this.spawn = spawn;
    }
    /**
     * @inheritdoc
     */
    lookup(onEntry, value) {
        return new Promise((resolve, reject) => {
            const proc = this.createProcess();
            const parser = this.createParser();
            proc.on('error', reject);
            proc.stderr.on('error', data => reject(`Error finding processes: ${data.toString()}`));
            proc.stdout.pipe(split2_1.default(/\r?\n/)).on('data', line => {
                const process = parser(line);
                if (process) {
                    value = onEntry(process, value);
                }
            });
            proc.on('close', (code, signal) => {
                if (code === 0) {
                    resolve(value);
                }
                else if (code > 0) {
                    reject(new Error(`process terminated with exit code: ${code}`));
                }
                if (signal) {
                    reject(new Error(`process terminated with signal: ${signal}`));
                }
            });
        });
    }
}
exports.BaseProcessTree = BaseProcessTree;
//# sourceMappingURL=baseProcessTree.js.map
//# sourceMappingURL=baseProcessTree.js.map
