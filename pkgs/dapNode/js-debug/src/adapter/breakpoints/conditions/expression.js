"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapBreakCondition = exports.ExpressionCondition = void 0;
const simple_1 = require("./simple");
/**
 * Conditional breakpoint using a user-defined expression.
 */
class ExpressionCondition extends simple_1.SimpleCondition {
    constructor(params, breakCondition, breakOnError) {
        super(params, breakOnError ? exports.wrapBreakCondition(breakCondition) : breakCondition);
    }
}
exports.ExpressionCondition = ExpressionCondition;
exports.wrapBreakCondition = (condition) => `(()=>{try{return ${condition};}catch(e){console.error(e);return true}})()`;
//# sourceMappingURL=expression.js.map
//# sourceMappingURL=expression.js.map
