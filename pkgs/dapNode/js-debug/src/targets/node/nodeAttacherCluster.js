"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchAllChildren = void 0;
const watchdogSpawn_1 = require("./watchdogSpawn");
const cancellation_1 = require("../../common/cancellation");
const processTree_1 = require("../../ui/processTree/processTree");
const endpoints_1 = require("../browser/spawn/endpoints");
async function watchAllChildren(options, openerId, logger, cancellation = cancellation_1.NeverCancelled) {
    const node = await getProcessTree(options.pid, logger);
    if (!node) {
        return [];
    }
    const todo = [];
    let queue = node.children.slice();
    while (queue.length) {
        const child = queue.pop();
        queue = queue.concat(child.children);
        const { port } = processTree_1.analyseArguments(child.args);
        if (!port) {
            continue;
        }
        todo.push(endpoints_1.getWSEndpoint(`http://${options.hostname}:${port}`, cancellation, logger, true)
            .then(inspectorURL => watchdogSpawn_1.WatchDog.attach({
            ipcAddress: options.ipcAddress,
            scriptName: 'Child Process',
            inspectorURL,
            waitForDebugger: true,
            dynamicAttach: true,
            pid: String(child.pid),
            openerId,
        }))
            .catch(err => logger.info("internal" /* Internal */, 'Could not spawn WD for child process', {
            err,
            port,
            child,
        })));
    }
    return (await Promise.all(todo)).filter((wd) => !!wd);
}
exports.watchAllChildren = watchAllChildren;
/**
 * Returns a process tree rooting at the give process ID.
 */
async function getProcessTree(rootPid, logger) {
    const map = new Map();
    map.set(0, { children: [], pid: 0, ppid: 0, command: '', args: '' });
    try {
        await processTree_1.processTree.lookup(({ pid, ppid, command, args }) => {
            if (pid !== ppid) {
                map.set(pid, { pid, ppid, command, args, children: [] });
            }
            return map;
        }, null);
    }
    catch (err) {
        logger.warn("internal" /* Internal */, 'Error getting child process tree', err);
        return undefined;
    }
    const values = map.values();
    for (const p of values) {
        const parent = map.get(p.ppid);
        if (parent && parent !== p) {
            parent.children.push(p);
        }
    }
    if (!isNaN(rootPid) && rootPid > 0) {
        return map.get(rootPid);
    }
    return map.get(0);
}
//# sourceMappingURL=nodeAttacherCluster.js.map
//# sourceMappingURL=nodeAttacherCluster.js.map
