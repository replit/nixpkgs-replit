"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLogSink = void 0;
const logOmittedCalls_1 = require("../../dap/logOmittedCalls");
/**
 * A log sink that writes to the console output.
 */
class ConsoleLogSink {
    constructor(dap) {
        this.dap = dap;
    }
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
        const category = item.level > 3 /* Error */ ? 'stderr' : item.level === 2 /* Warn */ ? 'console' : 'stdout';
        let output = `[${getLogLevel(item.level)}@${getFormattedTimeString()}] [${item.tag}]`;
        if (item.message) {
            output += ` ${item.message}`;
        }
        if (item.metadata) {
            output += `: ${JSON.stringify(item.metadata)}`;
        }
        output += '\n';
        this.dap.output(logOmittedCalls_1.omitLoggingFor({ category, output }));
    }
}
exports.ConsoleLogSink = ConsoleLogSink;
function getFormattedTimeString() {
    const d = new Date();
    const hourString = String(d.getUTCHours()).padStart(2, '0');
    const minuteString = String(d.getUTCMinutes()).padStart(2, '0');
    const secondString = String(d.getUTCSeconds()).padStart(2, '0');
    const millisecondString = String(d.getUTCMilliseconds()).padStart(3, '0');
    return `${hourString}:${minuteString}:${secondString}.${millisecondString}`;
}
function getLogLevel(level) {
    switch (level) {
        case 4 /* Fatal */:
            return 'FATAL';
        case 3 /* Error */:
            return 'ERROR';
        case 2 /* Warn */:
            return 'WARN';
        case 1 /* Info */:
            return 'INFO';
        case 0 /* Verbose */:
            return 'VERB';
        default:
            return 'UNKNOWN';
    }
}
//# sourceMappingURL=consoleLogSink.js.map
//# sourceMappingURL=consoleLogSink.js.map
