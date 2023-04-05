"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StdoutLogSink = void 0;
const signale_1 = __importDefault(require("signale"));
/**
 * A log sink that writes to the console output of the current process
 */
class StdoutLogSink {
    /**
     * @inheritdoc
     */
    async setup() {
        // no-op
    }
    /**
     * @inheritdoc
     */
    dispose() {
        // no-op
    }
    /**
     * @inheritdoc
     */
    write(item) {
        let output = `[${item.tag}]`;
        if (item.message) {
            output += ` ${item.message}`;
        }
        if (item.metadata) {
            output += `: ${JSON.stringify(item.metadata)}`;
        }
        getLogFn(item.level).call(signale_1.default, output);
    }
}
exports.StdoutLogSink = StdoutLogSink;
function getLogFn(level) {
    switch (level) {
        case 4 /* Fatal */:
            return signale_1.default.fatal;
        case 3 /* Error */:
            return signale_1.default.error;
        case 2 /* Warn */:
            return signale_1.default.warn;
        case 1 /* Info */:
            return signale_1.default.info;
        case 0 /* Verbose */:
            return signale_1.default.debug;
        default:
            return signale_1.default.debug;
    }
}
//# sourceMappingURL=stdoutLogSink.js.map
//# sourceMappingURL=stdoutLogSink.js.map
