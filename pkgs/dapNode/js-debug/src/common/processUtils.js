"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawnAsync = exports.ChildProcessError = void 0;
const child_process_1 = require("child_process");
/**
 * Thrown from {@link spawnAsync} if an error or non-zero exit code occurs.
 */
class ChildProcessError extends Error {
    constructor(command, stderr, stdout, code, innerError) {
        super(`${command} exited with code ${code || -1}: ${stderr}`);
        this.command = command;
        this.stderr = stderr;
        this.stdout = stdout;
        this.code = code;
        this.innerError = innerError;
    }
    static fromExeca(result) {
        return new ChildProcessError(result.command, result.stderr.toString(), result.stdout.toString(), result.exitCode);
    }
}
exports.ChildProcessError = ChildProcessError;
/**
 * Nicely wrapped `spawn` that returns stdout as a string.
 * @throws {ChildProcessError}
 */
function spawnAsync(command, args, options) {
    return new Promise((resolve, reject) => {
        const process = child_process_1.spawn(command, args, Object.assign(Object.assign({}, options), { stdio: 'pipe' }));
        const stderr = [];
        const stdout = [];
        process.stderr.on('data', chunk => stderr.push(chunk));
        process.stdout.on('data', chunk => stdout.push(chunk));
        const rejectWithError = (code, innerError) => reject(new ChildProcessError(command, Buffer.concat(stderr).toString(), Buffer.concat(stdout).toString(), code, innerError));
        process.on('error', err => rejectWithError(undefined, err));
        process.on('close', code => code
            ? rejectWithError(code)
            : resolve({
                stdout: Buffer.concat(stdout).toString(),
                stderr: Buffer.concat(stderr).toString(),
            }));
    });
}
exports.spawnAsync = spawnAsync;
//# sourceMappingURL=processUtils.js.map
//# sourceMappingURL=processUtils.js.map
