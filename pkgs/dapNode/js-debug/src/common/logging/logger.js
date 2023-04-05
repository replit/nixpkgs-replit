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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var Logger_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const inversify_1 = require("inversify");
const os = __importStar(require("os"));
const _1 = require(".");
const testLogSink_1 = require("./testLogSink");
const configuration_1 = require("../../configuration");
/**
 * Implementation of ILogger for the extension.
 */
let Logger = Logger_1 = class Logger {
    constructor() {
        /**
         * The target of the logger. Either a list of sinks, or a queue of items
         * to write once we get sinks.
         */
        this.logTarget = { queue: [] };
        /**
         * Minimum log level.
         */
        this.minLevel = 0 /* Verbose */;
    }
    /**
     * Creates a logger with the TestLogSink hooked up.
     */
    static async test(level = 1 /* Info */) {
        const logger = new Logger_1();
        logger.setup({ sinks: [new testLogSink_1.TestLogSink()], level, showWelcome: false });
        return logger;
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
    log(data) {
        if ('queue' in this.logTarget) {
            this.logTarget.queue.push(data);
            return;
        }
        if (data.level < this.minLevel) {
            return;
        }
        if (this.tags && !this.tags.has(data.tag)) {
            return;
        }
        for (const sink of this.logTarget.sinks) {
            sink.write(data);
        }
    }
    /**
     * @inheritdoc
     */
    dispose() {
        if ('sinks' in this.logTarget) {
            for (const target of this.logTarget.sinks) {
                target.dispose();
            }
            this.logTarget = { queue: [] };
        }
    }
    /**
     * @inheritdoc
     */
    forTarget() {
        return this;
    }
    /**
     * Adds the given sinks to the loggers. Plays back any items buffered in the queue.
     */
    async setup(options) {
        this.minLevel = options.level;
        if (options.tags && options.tags.length) {
            // Add all log tags that equal or are children of the one given in the
            // options. For instance, `cdp` adds the tags `cdp`, `cdp.send`, etc.
            this.tags = new Set(options.tags
                .map(src => _1.allLogTags.filter(tag => tag === src || tag.startsWith(`${src}.`)))
                .reduce((acc, tags) => [...acc, ...tags], []));
        }
        else {
            this.tags = undefined;
        }
        await Promise.all(options.sinks.map(s => s.setup()));
        if (options.showWelcome !== false) {
            const message = createWelcomeMessage();
            for (const sink of options.sinks) {
                sink.write(message);
            }
        }
        const prevTarget = this.logTarget;
        this.logTarget = { sinks: options.sinks.slice() };
        if ('sinks' in prevTarget) {
            prevTarget.sinks.forEach(s => s.dispose());
        }
        else {
            // intentionally re-`log()` instead of writing directly to sinks so that
            // and tag or level filtering is applied.
            prevTarget.queue.forEach(m => this.log(m));
        }
    }
};
/**
 * A no-op logger that never logs anything.
 */
Logger.null = (() => {
    const logger = new Logger_1();
    logger.setup({ sinks: [], level: 4 /* Fatal */ + 1 });
    return logger;
})();
Logger = Logger_1 = __decorate([
    inversify_1.injectable()
], Logger);
exports.Logger = Logger;
const createWelcomeMessage = () => ({
    timestamp: Date.now(),
    tag: "runtime.welcome" /* RuntimeWelcome */,
    level: 1 /* Info */,
    message: `${configuration_1.packageName} v${configuration_1.packageVersion} started`,
    metadata: {
        os: `${os.platform()} ${os.arch()}`,
        nodeVersion: process.version,
        adapterVersion: configuration_1.packageVersion,
    },
});
//# sourceMappingURL=logger.js.map
//# sourceMappingURL=logger.js.map
