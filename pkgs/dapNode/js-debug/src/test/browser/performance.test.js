"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
const testIntegrationUtils_1 = require("../testIntegrationUtils");
describe('performance', () => {
    testIntegrationUtils_1.itIntegrates('gets performance information', async ({ r }) => {
        const p = await r.launchUrlAndLoad('index.html');
        const res = await p.dap.getPerformance({});
        chai_1.expect(res.error).to.be.undefined;
        chai_1.expect(res.metrics).to.not.be.empty;
    });
});
//# sourceMappingURL=performance.test.js.map
//# sourceMappingURL=performance.test.js.map
