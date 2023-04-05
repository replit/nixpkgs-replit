"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.killTree = void 0;
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
const child_process_1 = require("child_process");
const path_1 = require("path");
/**
 * Kills the tree of processes starting at the given parent ID.
 */
function killTree(processId, logger, behavior = "forceful" /* Forceful */) {
    if (behavior === "none" /* None */) {
        return true;
    }
    if (process.platform === 'win32') {
        const windir = process.env['WINDIR'] || 'C:\\Windows';
        const TASK_KILL = path_1.join(windir, 'System32', 'taskkill.exe');
        // when killing a process in Windows its child processes are *not* killed but become root processes.
        // Therefore we use TASKKILL.EXE
        try {
            child_process_1.execSync(`${TASK_KILL} ${behavior === "forceful" /* Forceful */ ? '/F' : ''} /T /PID ${processId}`);
            return true;
        }
        catch (err) {
            logger.error("runtime.exception" /* RuntimeException */, 'Error running taskkill.exe', err);
            return false;
        }
    }
    else {
        // on linux and OS X we kill all direct and indirect child processes as well
        try {
            const cmd = path_1.join(__dirname, './terminateProcess.sh');
            const r = child_process_1.spawnSync('sh', [
                cmd,
                processId.toString(),
                behavior === "forceful" /* Forceful */ ? '9' : '15',
            ]);
            if (r.stderr && r.status) {
                logger.error("runtime.exception" /* RuntimeException */, 'Error running terminateProcess', r);
                return false;
            }
            return true;
        }
        catch (err) {
            logger.error("runtime.exception" /* RuntimeException */, 'Error running terminateProcess', err);
            return false;
        }
    }
}
exports.killTree = killTree;
//# sourceMappingURL=killTree.js.map
//# sourceMappingURL=killTree.js.map
