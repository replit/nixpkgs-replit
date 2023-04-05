"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const promiseUtil_1 = require("../../common/promiseUtil");
const lease_file_1 = require("../../targets/node/lease-file");
describe('node lease file', () => {
    let file;
    beforeEach(() => (file = new lease_file_1.LeaseFile()));
    afterEach(() => file.dispose());
    it('says the lease is not valid for missing files', async () => {
        chai_1.expect(lease_file_1.LeaseFile.isValid('does-not-exist.txt')).to.be.false;
    });
    it('says the lease is not valid if too far in the past', async () => {
        await file.touch(() => Date.now() - 5000);
        chai_1.expect(lease_file_1.LeaseFile.isValid(file.path)).to.be.false;
    });
    it('says the lease is valid if recent', async () => {
        await file.touch(() => Date.now());
        chai_1.expect(lease_file_1.LeaseFile.isValid(file.path)).to.be.true;
    });
    it('truncates and updates on touches', async () => {
        await file.touch(() => Date.now() - 5000);
        await file.touch(() => Date.now());
        chai_1.expect(lease_file_1.LeaseFile.isValid(file.path)).to.be.true;
    });
    it('disposes the file', async () => {
        await file.touch(() => Date.now());
        await file.dispose();
        chai_1.expect(lease_file_1.LeaseFile.isValid(file.path)).to.be.false;
    });
    it('disposes the touch loop', async () => {
        await file.startTouchLoop();
        await file.dispose();
        await promiseUtil_1.delay(1200);
        chai_1.expect(lease_file_1.LeaseFile.isValid(file.path)).to.be.false;
    });
});
//# sourceMappingURL=lease-file.test.js.map
//# sourceMappingURL=lease-file.test.js.map
