"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleCondition = void 0;
const sourceUtils_1 = require("../../../common/sourceUtils");
const errors_1 = require("../../../dap/errors");
const protocolError_1 = require("../../../dap/protocolError");
/**
 * Simple conditional breakpoint with an expression evaluated on the browser
 * side of things.
 */
class SimpleCondition {
    constructor(params, breakCondition) {
        this.breakCondition = breakCondition;
        const err = breakCondition && sourceUtils_1.getSyntaxErrorIn(breakCondition);
        if (err) {
            throw new protocolError_1.ProtocolError(errors_1.invalidBreakPointCondition(params, err.message));
        }
    }
    shouldStayPaused() {
        return Promise.resolve(true); // if Chrome paused on us, it means the expression passed
    }
}
exports.SimpleCondition = SimpleCondition;
//# sourceMappingURL=simple.js.map
//# sourceMappingURL=simple.js.map
