"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const positions_1 = require("./positions");
const stringUtils_1 = require("./stringUtils");
describe('stringUtils', () => {
    it('positionToOffset', () => {
        const simple = new stringUtils_1.PositionToOffset('hello\nworld');
        chai_1.expect(simple.convert(new positions_1.Base0Position(0, 2))).to.equal(2);
        chai_1.expect(simple.convert(new positions_1.Base0Position(1, 2))).to.equal(8);
        const toOffset = new stringUtils_1.PositionToOffset('\nhello\nworld\n');
        chai_1.expect(toOffset.convert(new positions_1.Base0Position(0, 0))).to.equal(0);
        chai_1.expect(toOffset.convert(new positions_1.Base0Position(0, 10))).to.equal(0);
        chai_1.expect(toOffset.convert(new positions_1.Base0Position(1, 0))).to.equal(1);
        chai_1.expect(toOffset.convert(new positions_1.Base0Position(1, 5))).to.equal(6);
        chai_1.expect(toOffset.convert(new positions_1.Base0Position(2, 1))).to.equal(8);
        chai_1.expect(toOffset.convert(new positions_1.Base0Position(3, 0))).to.equal(13);
        chai_1.expect(toOffset.convert(new positions_1.Base0Position(10, 0))).to.equal(13);
    });
});
//# sourceMappingURL=stringUtils.test.js.map
//# sourceMappingURL=stringUtils.test.js.map
