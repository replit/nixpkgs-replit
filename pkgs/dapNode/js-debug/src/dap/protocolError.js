"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtocolError = void 0;
class ProtocolError extends Error {
    constructor(cause) {
        super('__errorMarker' in cause ? cause.error.format : cause.format);
        this._cause = '__errorMarker' in cause ? cause.error : cause;
    }
    get cause() {
        return this._cause;
    }
}
exports.ProtocolError = ProtocolError;
//# sourceMappingURL=protocolError.js.map
//# sourceMappingURL=protocolError.js.map
