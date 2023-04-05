"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.HitCondition = void 0;
const errors_1 = require("../../../dap/errors");
const protocolError_1 = require("../../../dap/protocolError");
/**
 * Regex used to match hit conditions. It matches the operator in group 1 and
 * the constant in group 2.
 */
const hitConditionRe = /^(>|>=|={1,3}|<|<=|%)?\s*([0-9]+)$/;
/**
 * A hit condition breakpoint encapsulates the handling of breakpoints hit on
 * a certain "nth" times we pause on them. For instance, a user could define
 * a hit condition breakpoint to pause the second time we reach it.
 *
 * This is used and exposed by the {@link Breakpoint} class.
 */
class HitCondition {
    constructor(predicate) {
        this.predicate = predicate;
        this.hits = 0;
        this.breakCondition = undefined;
    }
    /**
     * @inheritdoc
     */
    shouldStayPaused() {
        return Promise.resolve(this.predicate(++this.hits));
    }
    /**
     * Parses the hit condition expression, like "> 42", into a {@link HitCondition}.
     * @throws {ProtocolError} if the expression is invalid
     */
    static parse(expression) {
        const parts = hitConditionRe.exec(expression);
        if (!parts) {
            throw new protocolError_1.ProtocolError(errors_1.invalidHitCondition(expression));
        }
        const [, op, value] = parts;
        const expr = op === '%'
            ? `return (numHits % ${value}) === 0;`
            : op[0] === '='
                ? `return numHits === ${value};`
                : `return numHits ${op} ${value};`;
        return new HitCondition(new Function('numHits', expr));
    }
}
exports.HitCondition = HitCondition;
//# sourceMappingURL=hitCount.js.map
//# sourceMappingURL=hitCount.js.map
