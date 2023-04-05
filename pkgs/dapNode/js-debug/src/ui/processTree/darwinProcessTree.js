"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.DarwinProcessTree = void 0;
const baseProcessTree_1 = require("./baseProcessTree");
const processUtils_1 = require("../../common/processUtils");
const path_1 = require("path");
class DarwinProcessTree extends baseProcessTree_1.BaseProcessTree {
    constructor(fsUtils) {
        super();
        this.fsUtils = fsUtils;
    }
    async getWorkingDirectory(processId) {
        try {
            const { stdout } = await processUtils_1.spawnAsync('lsof', [
                // AND options
                '-a',
                // Get the cwd
                '-dcwd',
                // Filter to the cwd
                '-Fn',
                // For this process
                `-p${processId}`,
            ]);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const cwd = stdout.trim().split('\n').pop().slice(1);
            return cwd && path_1.isAbsolute(cwd) && (await this.fsUtils.exists(cwd)) ? cwd : undefined;
        }
        catch (e) {
            if (e instanceof processUtils_1.ChildProcessError) {
                return undefined;
            }
            throw e;
        }
    }
    /**
     * @inheritdoc
     */
    createProcess() {
        return this.spawn('/bin/ps', [
            '-xo',
            // The "aaaa" is needed otherwise the command name can get truncated.
            `pid=PID,ppid=PPID,comm=${'a'.repeat(256)},command=COMMAND`,
        ]);
    }
    /**
     * @inheritdoc
     */
    createParser() {
        // We know PID and PPID are numbers, so we can split and trim those easily.
        // The command column is headed with "COMMAND", so the alg is to:
        // 1. Split [pid, ppid] until the third set of whitespace in the string
        // 2. Trim the binary between the third whitespace and index of COMMAND
        // 3. The COMMAND is everything else, trimmed.
        let commandOffset;
        return line => {
            if (!commandOffset) {
                commandOffset = line.indexOf('COMMAND');
                return;
            }
            const ids = /^\W*([0-9]+)\W*([0-9]+)\W*/.exec(line);
            if (!ids) {
                return;
            }
            return {
                pid: Number(ids[1]),
                ppid: Number(ids[2]),
                command: line.slice(ids[0].length, commandOffset).trim(),
                args: line.slice(commandOffset).trim(),
            };
        };
    }
}
exports.DarwinProcessTree = DarwinProcessTree;
//# sourceMappingURL=darwinProcessTree.js.map
//# sourceMappingURL=darwinProcessTree.js.map
