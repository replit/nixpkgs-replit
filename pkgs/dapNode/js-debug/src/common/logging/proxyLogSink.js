"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyLogSink = void 0;
/*
 * A log sink that writes information to another logger.
 */
class ProxyLogSink {
    constructor(logger) {
        this.logger = logger;
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
        this.logger = undefined;
    }
    /**
     * @inheritdoc
     */
    write(item) {
        var _a;
        (_a = this.logger) === null || _a === void 0 ? void 0 : _a.log(item);
    }
}
exports.ProxyLogSink = ProxyLogSink;
//# sourceMappingURL=proxyLogSink.js.map
//# sourceMappingURL=proxyLogSink.js.map
