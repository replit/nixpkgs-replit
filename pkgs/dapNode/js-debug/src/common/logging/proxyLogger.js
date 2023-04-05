"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyLogger = void 0;
class ProxyLogger {
    constructor() {
        this.target = { queue: [] };
    }
    /**
     * Connects this logger to the given instance.
     */
    connectTo(logger) {
        this.target = { logger };
    }
    /**
     * @inheritdoc
     */
    info(tag, msg, metadata) {
        this.log({
            tag,
            timestamp: Date.now(),
            message: msg,
            metadata,
            level: 1 /* Info */,
        });
    }
    /**
     * @inheritdoc
     */
    verbose(tag, msg, metadata) {
        this.log({
            tag,
            timestamp: Date.now(),
            message: msg,
            metadata,
            level: 0 /* Verbose */,
        });
    }
    /**
     * @inheritdoc
     */
    warn(tag, msg, metadata) {
        this.log({
            tag,
            timestamp: Date.now(),
            message: msg,
            metadata,
            level: 2 /* Warn */,
        });
    }
    /**
     * @inheritdoc
     */
    error(tag, msg, metadata) {
        this.log({
            tag,
            timestamp: Date.now(),
            message: msg,
            metadata,
            level: 3 /* Error */,
        });
    }
    /**
     * @inheritdoc
     */
    fatal(tag, msg, metadata) {
        this.log({
            tag,
            timestamp: Date.now(),
            message: msg,
            metadata,
            level: 4 /* Fatal */,
        });
    }
    /**
     * @inheritdoc
     */
    log(data) {
        if (!this.target) {
            // no-op
        }
        else if ('queue' in this.target) {
            this.target.queue.push(data);
        }
        else {
            this.target.logger.log(data);
        }
    }
    /**
     * Makes an assertion, *logging* if it failed.
     */
    assert(assertion, message) {
        if (assertion === false || assertion === undefined || assertion === null) {
            this.error("runtime.assertion" /* RuntimeAssertion */, message, { error: new Error('Assertion failed') });
            if (process.env.JS_DEBUG_THROW_ASSERTIONS) {
                throw new Error(message);
            }
            debugger; // break when running in development
            return false;
        }
        return true;
    }
    /**
     * @inheritdoc
     */
    setup() {
        throw new Error('A ProxyLogger cannot be setup()');
    }
    /**
     * @inheritdoc
     */
    dispose() {
        this.target = undefined;
    }
    /**
     * @inheritdoc
     */
    forTarget() {
        return new ProxyLogger();
    }
}
exports.ProxyLogger = ProxyLogger;
//# sourceMappingURL=proxyLogger.js.map
//# sourceMappingURL=proxyLogger.js.map
