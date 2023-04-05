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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const inspector = __importStar(require("inspector"));
const micromatch_1 = __importDefault(require("micromatch"));
const path = __importStar(require("path"));
const findOpenPortSync_1 = require("../../common/findOpenPortSync");
const knownTools_1 = require("../../common/knownTools");
const environment_1 = require("./bootloader/environment");
const filters_1 = require("./bootloader/filters");
const logger_1 = require("./bootloader/logger");
const bundlePaths_1 = require("./bundlePaths");
const createTargetId_1 = require("./createTargetId");
const telemetry = {
    cwd: process.cwd(),
    processId: process.pid,
    nodeVersion: process.version,
    architecture: process.arch,
};
const jsDebugRegisteredToken = '$jsDebugIsRegistered';
(() => {
    try {
        if (jsDebugRegisteredToken in global) {
            return;
        }
        const env = new environment_1.BootloaderEnvironment(process.env);
        const inspectorOptions = env.inspectorOptions;
        logger_1.bootloaderLogger.info("runtime.launch" /* RuntimeLaunch */, 'Bootloader imported', {
            env: inspectorOptions,
            args: process.argv,
        });
        Object.assign(global, { [jsDebugRegisteredToken]: true });
        if (!filters_1.checkAll(inspectorOptions)) {
            env.unsetForTree(); // save work for any children
            return;
        }
        try {
            if (!require('worker_threads').isMainThread) {
                return;
            }
        }
        catch (_a) {
            // ignored, old node version without worker threads
        }
        reportTelemetry(env);
        if (/(\\|\/|^)node(64)?(.exe)?$/.test(process.execPath)) {
            inspectorOptions.execPath = process.execPath;
        }
        const ownId = createTargetId_1.createTargetId();
        const didAttach = inspectOrQueue(inspectorOptions, ownId);
        if (inspectorOptions.onlyEntrypoint) {
            env.unsetForTree();
        }
        else if (didAttach) {
            env.updateInspectorOption('openerId', ownId);
        }
    }
    catch (e) {
        console.error(`Error in the js-debug bootloader, please report to https://aka.ms/js-dbg-issue: ${e.stack}`);
    }
})();
function inspectOrQueue(env, ownId) {
    const mode = !isPipeAvailable(env.inspectorIpc)
        ? 2 /* Inactive */
        : env.deferredMode
            ? 1 /* Deferred */
            : 0 /* Immediate */;
    logger_1.bootloaderLogger.info("runtime" /* Runtime */, 'Set debug mode', { mode });
    if (mode === 2 /* Inactive */) {
        return false;
    }
    // inspector.url() will be defined if --inspect is passed to the process.
    // Don't call it again to avoid https://github.com/nodejs/node/issues/33012
    const openedFromCli = inspector.url() !== undefined;
    if (!openedFromCli) {
        // if the debugger isn't explicitly enabled, turn it on based on our inspect mode
        if (!shouldForceProcessIntoDebugMode(env)) {
            return false;
        }
        inspector.open(getInspectPort(env), undefined, false); // first call to set the inspector.url()
    }
    const info = {
        ipcAddress: env.inspectorIpc || '',
        pid: String(process.pid),
        telemetry,
        scriptName: process.argv[1],
        inspectorURL: inspector.url(),
        waitForDebugger: true,
        ownId,
        openerId: env.openerId,
    };
    if (mode === 0 /* Immediate */) {
        spawnWatchdog(env.execPath || process.execPath, info);
    }
    else {
        // The bootloader must call inspector.open() synchronously, which will block
        // the event loop. Spawn the watchdog handoff in a new process to debug this.
        /*
        // Minified code is given in spawnSync:
    
        const c: Socket = require('net').createConnection(process.env.NODE_INSPECTOR_IPC);
        setTimeout(() => {
          console.error('timeout');
          process.exit(1);
        }, 10000);
        c.on('error', err => {
          console.error(err);
          process.exit(1);
        });
        c.on('connect', () => {
          c.write(process.env.NODE_INSPECTOR_INFO, 'utf-8');
          c.write(Buffer.from([0]));
          c.on('data', c => {
            console.error('read byte', c[0]);
            process.exit(c[0]);
          });
        });
        */
        const { status, stderr } = child_process_1.spawnSync(env.execPath || process.execPath, [
            '-e',
            `const c=require("net").createConnection(process.env.NODE_INSPECTOR_IPC);setTimeout(()=>{console.error("timeout"),process.exit(1)},10000),c.on("error",e=>{console.error(e),process.exit(1)}),c.on("connect",()=>{c.write(process.env.NODE_INSPECTOR_INFO,"utf-8"),c.write(Buffer.from([0])),c.on("data",e=>{console.error("read byte",e[0]),process.exit(e[0])})});`,
        ], {
            env: {
                NODE_SKIP_PLATFORM_CHECK: process.env.NODE_SKIP_PLATFORM_CHECK,
                NODE_INSPECTOR_INFO: JSON.stringify(info),
                NODE_INSPECTOR_IPC: env.inspectorIpc,
            },
        });
        if (status) {
            console.error(stderr.toString());
            console.error(`Error activating auto attach, please report to https://aka.ms/js-dbg-issue`);
            return false; // some error status code
        }
    }
    // todo: update node.js typings
    const cast = inspector;
    if (cast.waitForDebugger) {
        cast.waitForDebugger();
    }
    else {
        inspector.open(openedFromCli ? undefined : 0, undefined, true);
    }
    return true;
}
/**
 * Returns the port that the inspector should listen on.
 */
function getInspectPort(env) {
    // Port checking is a little slow (especially on windows), avoid doing
    // so if port registration is not mandatory
    if (!env.mandatePortTracking) {
        return 0;
    }
    try {
        return findOpenPortSync_1.findOpenPortSync({ attempts: 20 });
    }
    catch (_a) {
        return 0;
    }
}
function shouldForceProcessIntoDebugMode(env) {
    switch (env.autoAttachMode) {
        case "always" /* Always */:
            return true;
        case "smart" /* Smart */:
            return shouldSmartAttach(env);
        case "onlyWithFlag" /* OnlyWithFlag */:
        default:
            return false;
    }
}
/**
 * Returns whether to smart attach. The goal here is to avoid attaching to
 * scripts like `npm` or `webpack` which the user probably doesn't want to
 * debug. Unfortunately Node doesn't expose the originally argv to us where
 * we could detect a direct invokation of something like `npm install`,
 * so we match against the script name.
 */
function shouldSmartAttach(env) {
    const script = process.argv[1];
    if (!script) {
        return true; // node REPL
    }
    // otherwise, delegate to the patterns. Defaults exclude node_modules
    return autoAttachSmartPatternMatches(script, env);
}
function autoAttachSmartPatternMatches(script, env) {
    if (!env.aaPatterns) {
        return false;
    }
    const r = micromatch_1.default([script.replace(/\\/g, '/')], [...env.aaPatterns.map(p => p.replace(knownTools_1.knownToolToken, knownTools_1.knownToolGlob))], { dot: true, nocase: true });
    return r.length > 0;
}
function isPipeAvailable(pipe) {
    if (!pipe) {
        return false;
    }
    try {
        // normally we'd use l/stat, but doing so with pipes on windows actually
        // triggers a 'connection', so do this instead...
        return fs.readdirSync(path.dirname(pipe)).includes(path.basename(pipe));
    }
    catch (e) {
        return false;
    }
}
/**
 * Adds process telemetry to the debugger file if necessary.
 */
function reportTelemetry(env) {
    var _a;
    const callbackFile = (_a = env.inspectorOptions) === null || _a === void 0 ? void 0 : _a.fileCallback;
    if (!callbackFile) {
        return;
    }
    fs.writeFileSync(callbackFile, JSON.stringify(telemetry));
    env.updateInspectorOption('fileCallback', undefined);
}
/**
 * Spawns a watchdog attached to the given process.
 */
function spawnWatchdog(execPath, watchdogInfo) {
    const p = child_process_1.spawn(execPath, [bundlePaths_1.watchdogPath], {
        env: {
            NODE_INSPECTOR_INFO: JSON.stringify(watchdogInfo),
            NODE_SKIP_PLATFORM_CHECK: process.env.NODE_SKIP_PLATFORM_CHECK,
        },
        stdio: 'ignore',
        detached: true,
    });
    p.unref();
    return p;
}
//# sourceMappingURL=bootloader.js.map
//# sourceMappingURL=bootloader.js.map
