"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.PosixProcessTree = void 0;
const darwinProcessTree_1 = require("./darwinProcessTree");
class PosixProcessTree extends darwinProcessTree_1.DarwinProcessTree {
    /**
     * @inheritdoc
     */
    createProcess() {
        return this.spawn('/bin/ps', ['-axo', `pid=PID,ppid=PPID,comm:30,command=COMMAND`]);
    }
    /**
     * @inheritdoc
     */
    createParser() {
        const parser = super.createParser();
        return line => {
            const process = parser(line);
            if (!process) {
                return;
            }
            let pos = process.args.indexOf(process.command);
            if (pos === -1) {
                return process;
            }
            pos = pos + process.command.length;
            while (pos < process.args.length) {
                if (process.args[pos] === ' ') {
                    break;
                }
                pos++;
            }
            process.command = process.args.substr(0, pos);
            process.args = process.args.substr(pos + 1);
            return process;
        };
    }
}
exports.PosixProcessTree = PosixProcessTree;
//# sourceMappingURL=posixProcessTree.js.map
//# sourceMappingURL=posixProcessTree.js.map
