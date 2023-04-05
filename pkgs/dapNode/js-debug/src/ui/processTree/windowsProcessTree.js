"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowsProcessTree = void 0;
const baseProcessTree_1 = require("./baseProcessTree");
const path_1 = require("path");
class WindowsProcessTree extends baseProcessTree_1.BaseProcessTree {
    /**
     * @inheritdoc
     */
    async getWorkingDirectory() {
        return undefined; // not supported
    }
    /**
     * @inheritdoc
     */
    createProcess() {
        const wmic = path_1.join(process.env['WINDIR'] || 'C:\\Windows', 'System32', 'wbem', 'WMIC.exe');
        return this.spawn(wmic, [
            'process',
            'get',
            'CommandLine,CreationDate,ParentProcessId,ProcessId',
        ]);
    }
    /**
     * @inheritdoc
     */
    createParser() {
        // attributes columns are in alphabetic order!
        const CMD_PAT = /^(.*)\s+([0-9]+)\.[0-9]+[+-][0-9]+\s+([0-9]+)\s+([0-9]+)$/;
        return line => {
            const matches = CMD_PAT.exec(line.trim());
            if (!matches || matches.length !== 5) {
                return;
            }
            const pid = Number(matches[4]);
            const ppid = Number(matches[3]);
            const date = Number(matches[2]);
            let args = matches[1].trim();
            if (!isNaN(pid) && !isNaN(ppid) && args) {
                let command = args;
                if (args[0] === '"') {
                    const end = args.indexOf('"', 1);
                    if (end > 0) {
                        command = args.substr(1, end - 1);
                        args = args.substr(end + 2);
                    }
                }
                else {
                    const end = args.indexOf(' ');
                    if (end > 0) {
                        command = args.substr(0, end);
                        args = args.substr(end + 1);
                    }
                    else {
                        args = '';
                    }
                }
                return { pid, ppid, command, args, date };
            }
        };
    }
}
exports.WindowsProcessTree = WindowsProcessTree;
//# sourceMappingURL=windowsProcessTree.js.map
//# sourceMappingURL=windowsProcessTree.js.map
