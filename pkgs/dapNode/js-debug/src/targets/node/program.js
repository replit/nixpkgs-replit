"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalProcess = exports.WatchDogProgram = exports.StubProgram = exports.SubprocessProgram = exports.CombinedProgram = void 0;
const killTree_1 = require("./killTree");
/**
 * A Program that wraps two other programs. "Stops" once either of the programs
 * stop. If one program stops, the other is also stopped automatically.
 */
class CombinedProgram {
    constructor(a, b) {
        this.a = a;
        this.b = b;
        this.stopped = Promise.race([
            this.a.stopped.then(async (r) => (await this.b.stop()) && r),
            this.b.stopped.then(async (r) => (await this.a.stop()) && r),
        ]);
    }
    gotTelemetery(telemetry) {
        this.a.gotTelemetery(telemetry);
        this.b.gotTelemetery(telemetry);
    }
    async stop() {
        const r = await Promise.all([this.a.stop(), this.b.stop()]);
        return r[0];
    }
}
exports.CombinedProgram = CombinedProgram;
/**
 * Program created from a subprocess.
 */
class SubprocessProgram {
    constructor(child, logger, killBehavior) {
        this.child = child;
        this.logger = logger;
        this.killBehavior = killBehavior;
        this.killed = false;
        this.stopped = new Promise((resolve, reject) => {
            child.once('exit', code => resolve({ killed: this.killed, code: code || 0 }));
            child.once('error', error => reject({ killed: this.killed, code: 1, error }));
        });
    }
    gotTelemetery() {
        // no-op
    }
    stop() {
        this.killed = true;
        killTree_1.killTree(this.child.pid, this.logger, this.killBehavior);
        return this.stopped;
    }
}
exports.SubprocessProgram = SubprocessProgram;
/**
 * A no-op program that never stops until stop() is called. Currently, we use
 * this for VS Code launches as we have no way to forcefully close those sssions.
 */
class StubProgram {
    constructor() {
        this.stopped = new Promise(resolve => (this.stopDefer = resolve));
    }
    gotTelemetery() {
        // no-op
    }
    stop() {
        this.stopDefer({ code: 0, killed: true });
        return this.stopped;
    }
}
exports.StubProgram = StubProgram;
/**
 * Wrapper for the watchdog program.
 */
class WatchDogProgram extends StubProgram {
    constructor(wd) {
        super();
        this.wd = wd;
        wd.onEnd(this.stopDefer);
    }
    stop() {
        this.wd.dispose();
        return this.stopped;
    }
}
exports.WatchDogProgram = WatchDogProgram;
/**
 * Program created from a subprocess.
 */
class TerminalProcess {
    constructor(terminalResult, logger, killBehavior) {
        this.terminalResult = terminalResult;
        this.logger = logger;
        this.killBehavior = killBehavior;
        this.didStop = false;
        this.stopped = new Promise(resolve => (this.onStopped = killed => {
            this.didStop = true;
            resolve({ code: 0, killed });
        }));
        if (terminalResult.processId) {
            this.startPollLoop(terminalResult.processId);
        }
    }
    gotTelemetery({ processId }) {
        if (this.didStop) {
            killTree_1.killTree(processId, this.logger, this.killBehavior);
            return; // to avoid any races
        }
        if (!this.loop) {
            this.startPollLoop(processId);
        }
    }
    stop() {
        if (this.didStop) {
            return this.stopped;
        }
        this.didStop = true;
        // If we're already polling some process ID, kill it and accelerate polling
        // so we can confirm it's dead quickly.
        if (this.loop) {
            killTree_1.killTree(this.loop.processId, this.logger, this.killBehavior);
            this.startPollLoop(this.loop.processId, TerminalProcess.killConfirmInterval);
        }
        else if (this.terminalResult.shellProcessId) {
            // If we had a shell process ID, well, that's good enough.
            killTree_1.killTree(this.terminalResult.shellProcessId, this.logger, this.killBehavior);
            this.startPollLoop(this.terminalResult.shellProcessId, TerminalProcess.killConfirmInterval);
        }
        else {
            // Otherwise, we can't do anything. Pretend like we did.
            this.onStopped(true);
        }
        return this.stopped;
    }
    startPollLoop(processId, interval = TerminalProcess.terminationPollInterval) {
        if (this.loop) {
            clearInterval(this.loop.timer);
        }
        const loop = {
            processId,
            timer: setInterval(() => {
                if (!isProcessAlive(processId)) {
                    clearInterval(loop.timer);
                    this.onStopped(true);
                }
            }, interval),
        };
        this.loop = loop;
    }
}
exports.TerminalProcess = TerminalProcess;
/**
 * How often to check and see if the process exited.
 */
TerminalProcess.terminationPollInterval = 1000;
/**
 * How often to check and see if the process exited after we send a close signal.
 */
TerminalProcess.killConfirmInterval = 200;
function isProcessAlive(processId) {
    try {
        // kill with signal=0 just test for whether the proc is alive. It throws if not.
        process.kill(processId, 0);
        return true;
    }
    catch (_a) {
        return false;
    }
}
//# sourceMappingURL=program.js.map
//# sourceMappingURL=program.js.map
