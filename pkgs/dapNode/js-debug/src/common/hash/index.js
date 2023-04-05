"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hasher = void 0;
const child_process_1 = require("child_process");
const path_1 = require("path");
const objUtils_1 = require("../objUtils");
const promiseUtil_1 = require("../promiseUtil");
class Hasher {
    constructor(maxFailures = 3) {
        this.maxFailures = maxFailures;
        this.idCounter = 0;
        this.failureCount = 0;
        this.deferredMap = new Map();
        this.deferCleanup = objUtils_1.debounce(30000, () => this.cleanup());
    }
    /**
     * Gets the Chrome content hash of script contents.
     */
    async hashBytes(data) {
        const r = await this.send({ type: 1 /* HashBytes */, data, id: this.idCounter++ });
        return r.hash;
    }
    /**
     * Gets the Chrome content hash of a file.
     */
    async hashFile(file) {
        const r = await this.send({ type: 0 /* HashFile */, file, id: this.idCounter++ });
        return r.hash;
    }
    /**
     * Gets the Chrome content hash of script contents.
     */
    async verifyBytes(data, expected, checkNode) {
        const r = await this.send({
            type: 3 /* VerifyBytes */,
            data,
            id: this.idCounter++,
            expected,
            checkNode,
        });
        return r.matches;
    }
    /**
     * Gets the Chrome content hash of a file.
     */
    async verifyFile(file, expected, checkNode) {
        const r = await this.send({
            type: 2 /* VerifyFile */,
            file,
            id: this.idCounter++,
            expected,
            checkNode,
        });
        return r.matches;
    }
    /**
     * @inheritdoc
     */
    dispose() {
        this.cleanup();
        this.deferCleanup.clear();
    }
    send(req) {
        const cp = this.getProcess();
        if (!cp) {
            throw new Error('hash.bundle.js process unexpectedly exited');
        }
        this.deferCleanup();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const deferred = promiseUtil_1.getDeferred();
        this.deferredMap.set(req.id, { deferred, request: req });
        cp.send(req);
        return deferred.promise;
    }
    cleanup() {
        if (this.instance) {
            this.instance.removeAllListeners('exit');
            this.instance.kill();
            this.instance = undefined;
            this.failureCount = 0;
        }
    }
    getProcess() {
        if (this.instance) {
            return this.instance;
        }
        if (this.failureCount > this.maxFailures) {
            return undefined;
        }
        const instance = (this.instance = child_process_1.fork(path_1.join(__dirname, 'hash.bundle.js'), [], {
            env: {},
            silent: true,
            execArgv: [],
        }));
        instance.setMaxListeners(Infinity);
        instance.addListener('message', raw => {
            const msg = raw;
            const pending = this.deferredMap.get(msg.id);
            if (!pending) {
                return;
            }
            pending.deferred.resolve(msg);
            this.deferredMap.delete(msg.id);
        });
        instance.on('exit', () => {
            this.instance = undefined;
            if (this.failureCount++ >= this.maxFailures) {
                for (const { deferred } of this.deferredMap.values()) {
                    deferred.reject(new Error('hash.bundle.js process unexpectedly exited'));
                }
                this.deferredMap.clear();
                this.deferCleanup.clear();
            }
            else {
                const newInstance = this.getProcess();
                this.deferCleanup();
                for (const { request } of this.deferredMap.values()) {
                    newInstance === null || newInstance === void 0 ? void 0 : newInstance.send(request);
                }
            }
        });
        return instance;
    }
}
exports.Hasher = Hasher;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
