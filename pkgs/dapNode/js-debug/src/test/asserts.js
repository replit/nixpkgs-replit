"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertNotResolved = exports.assertResolved = exports.assertAstEqual = void 0;
const chai_1 = require("chai");
const estraverse_1 = require("estraverse");
const promiseUtil_1 = require("../common/promiseUtil");
const sourceCodeManipulations_1 = require("../common/sourceCodeManipulations");
exports.assertAstEqual = (a, b) => {
    const locationFreeParse = (str) => estraverse_1.traverse(sourceCodeManipulations_1.parseProgram(str), {
        enter(node) {
            delete node.loc;
            delete node.end;
            delete node.start;
        },
    });
    try {
        chai_1.expect(locationFreeParse(a)).to.deep.equal(locationFreeParse(b));
    }
    catch (_a) {
        throw new Error(`Expected\n\n${a}\n\n to be equivalent to\n\n${b}`);
    }
};
const unset = Symbol('unset');
exports.assertResolved = async (p) => {
    let r = unset;
    p.then(rv => {
        r = rv;
    });
    await promiseUtil_1.delay(0);
    if (r === unset) {
        throw new chai_1.AssertionError('Promise not resolved');
    }
    return r;
};
exports.assertNotResolved = async (p) => {
    let r = unset;
    p.then(rv => {
        r = rv;
    });
    await promiseUtil_1.delay(0);
    if (r !== unset) {
        throw new chai_1.AssertionError('Promise unexpectedly resolved');
    }
};
//# sourceMappingURL=asserts.js.map
//# sourceMappingURL=asserts.js.map
