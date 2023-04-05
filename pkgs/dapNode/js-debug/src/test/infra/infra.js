"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const testIntegrationUtils_1 = require("../testIntegrationUtils");
describe('infra', () => {
    testIntegrationUtils_1.itIntegrates('initialize', async ({ r }) => {
        r.log(await r.initialize);
        r.assertLog();
    });
});
//# sourceMappingURL=infra.js.map
//# sourceMappingURL=infra.js.map
