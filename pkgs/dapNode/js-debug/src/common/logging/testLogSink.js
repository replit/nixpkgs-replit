"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestLogSink = void 0;
/**
 * A log sink for use in testing that throws any errorful data, and writes
 * other data to the console.
 */
class TestLogSink {
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
        if (item.level > 2 /* Warn */) {
            throw new Error(item.message);
        }
        else {
            console.log(JSON.stringify(item));
        }
    }
}
exports.TestLogSink = TestLogSink;
//# sourceMappingURL=testLogSink.js.map
//# sourceMappingURL=testLogSink.js.map
