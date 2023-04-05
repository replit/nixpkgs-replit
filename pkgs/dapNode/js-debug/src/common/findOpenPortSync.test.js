"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const findOpenPortSync_1 = require("./findOpenPortSync");
describe('findOpenPortSync', () => {
    it('works', async function () {
        this.timeout(10000);
        chai_1.expect(findOpenPortSync_1.findOpenPortSync({ attempts: 5 })).to.be.greaterThan(0);
    });
});
//# sourceMappingURL=findOpenPortSync.test.js.map
//# sourceMappingURL=findOpenPortSync.test.js.map
