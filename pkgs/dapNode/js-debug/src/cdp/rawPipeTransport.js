"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RawPipeTransport = void 0;
const split2_1 = __importDefault(require("split2"));
const objUtils_1 = require("../common/objUtils");
const events_1 = require("../common/events");
const hrnow_1 = require("../common/hrnow");
class RawPipeTransport {
    constructor(logger, pipeWrite, pipeRead) {
        this.logger = logger;
        this.pipeWrite = pipeWrite;
        this.pipeRead = pipeRead;
        this.messageEmitter = new events_1.EventEmitter();
        this.endEmitter = new events_1.EventEmitter();
        this.onMessage = this.messageEmitter.event;
        this.onEnd = this.endEmitter.event;
        this.onceEnded = objUtils_1.once(() => {
            var _a;
            if (!this.streams) {
                return;
            }
            this.beforeClose();
            this.streams.read.removeAllListeners();
            // destroy pipeRead, not streams.read, since that will cause any buffered
            // data left in the `split()` transform to error when written.
            (_a = this.pipeRead) === null || _a === void 0 ? void 0 : _a.destroy();
            this.streams.write.removeListener('end', this.onceEnded);
            this.streams.write.removeListener('error', this.onWriteError);
            // Suppress pipe errors, e.g. EPIPE when pipe is destroyed with buffered data
            this.streams.write.on('error', () => undefined);
            this.streams.write.end();
            this.streams = undefined;
            this.endEmitter.fire();
        });
        this.onWriteError = (error) => {
            this.logger.error("internal" /* Internal */, 'pipeWrite error', { error });
        };
        const read = pipeRead || pipeWrite;
        this.streams = {
            read: read
                .on('error', error => this.logger.error("internal" /* Internal */, 'pipeRead error', { error }))
                .pipe(split2_1.default('\0'))
                .on('data', json => this.messageEmitter.fire([json, new hrnow_1.HrTime()]))
                .on('end', this.onceEnded),
            write: pipeWrite.on('end', this.onceEnded).on('error', this.onWriteError),
        };
    }
    /**
     * @inheritdoc
     */
    send(message) {
        var _a;
        (_a = this.streams) === null || _a === void 0 ? void 0 : _a.write.write(message + '\0');
    }
    /**
     * @inheritdoc
     */
    dispose() {
        this.onceEnded();
    }
    /**
     * Can be overridden to do any last minute finalization before the
     * streams are closed.
     */
    beforeClose() {
        // no-op
    }
}
exports.RawPipeTransport = RawPipeTransport;
//# sourceMappingURL=rawPipeTransport.js.map
//# sourceMappingURL=rawPipeTransport.js.map
