"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const stubbedApi_1 = require("../cdp/stubbedApi");
const objUtils_1 = require("../common/objUtils");
const stubbedApi_2 = require("../dap/stubbedApi");
const asserts_1 = require("../test/asserts");
const exceptionPauseService_1 = require("./exceptionPauseService");
describe('ExceptionPauseService', () => {
    let prepareEval;
    let isScriptSkipped;
    let ep;
    let stubDap;
    let stubCdp;
    beforeEach(() => {
        prepareEval = sinon_1.stub();
        isScriptSkipped = sinon_1.stub().returns(false);
        stubDap = stubbedApi_2.stubbedDapApi();
        stubCdp = stubbedApi_1.stubbedCdpApi();
        ep = new exceptionPauseService_1.ExceptionPauseService(objUtils_1.upcastPartial({ prepare: prepareEval }), objUtils_1.upcastPartial({ isScriptSkipped }), stubDap, objUtils_1.upcastPartial({}));
    });
    it('does not set pause state when bps not configured', async () => {
        await ep.apply(stubCdp.actual);
        chai_1.expect(stubCdp.Debugger.setPauseOnExceptions.callCount).to.equal(0);
        await asserts_1.assertResolved(ep.launchBlocker);
    });
    it('sets breakpoints in cdp before binding', async () => {
        await ep.setBreakpoints({ filters: ["all" /* All */] });
        await asserts_1.assertNotResolved(ep.launchBlocker);
        await ep.apply(stubCdp.actual);
        chai_1.expect(stubCdp.Debugger.setPauseOnExceptions.calledWith({ state: 'all' })).to.be.true;
        await asserts_1.assertResolved(ep.launchBlocker);
    });
    it('sets breakpoints in cdp after binding', async () => {
        await ep.apply(stubCdp.actual);
        await ep.setBreakpoints({ filters: ["all" /* All */] });
        chai_1.expect(stubCdp.Debugger.setPauseOnExceptions.calledWith({ state: 'all' })).to.be.true;
        await asserts_1.assertResolved(ep.launchBlocker);
    });
    it('unsets pause state', async () => {
        await ep.apply(stubCdp.actual);
        await ep.setBreakpoints({ filters: ["all" /* All */] });
        chai_1.expect(stubCdp.Debugger.setPauseOnExceptions.calledWith({ state: 'all' })).to.be.true;
        await ep.setBreakpoints({ filters: ["none" /* None */] });
        chai_1.expect(stubCdp.Debugger.setPauseOnExceptions.calledWith({ state: 'none' })).to.be.true;
    });
    it('changes pause state', async () => {
        await ep.apply(stubCdp.actual);
        await ep.setBreakpoints({ filters: ["all" /* All */] });
        chai_1.expect(stubCdp.Debugger.setPauseOnExceptions.calledWith({ state: 'all' })).to.be.true;
        await ep.setBreakpoints({ filters: ["uncaught" /* Uncaught */] });
        chai_1.expect(stubCdp.Debugger.setPauseOnExceptions.calledWith({ state: 'uncaught' })).to.be.true;
    });
    it('prints an error on conditional breakpoint parse error', async () => {
        await ep.apply(stubCdp.actual);
        await ep.setBreakpoints({
            filters: [],
            filterOptions: [{ filterId: "all" /* All */, condition: '(' }],
        });
        chai_1.expect(stubDap.output.args).to.containSubset([[{ category: 'stderr' }]]);
        chai_1.expect(stubCdp.Debugger.setPauseOnExceptions.called).to.be.false;
    });
    it('does not pause if script skipped', async () => {
        await ep.apply(stubCdp.actual);
        await ep.setBreakpoints({ filters: ["all" /* All */] });
        chai_1.expect(await ep.shouldPauseAt({
            callFrames: [],
            reason: 'exception',
        })).to.be.true;
        isScriptSkipped.returns(true);
        chai_1.expect(await ep.shouldPauseAt({
            callFrames: [],
            reason: 'exception',
        })).to.be.true;
        isScriptSkipped.returns(false);
    });
    it('prepares an expression if a condition is given', async () => {
        const expr = sinon_1.stub();
        prepareEval.returns({ invoke: expr });
        await ep.apply(stubCdp.actual);
        await ep.setBreakpoints({
            filters: [],
            filterOptions: [{ filterId: "all" /* All */, condition: 'error.name == "hi"' }],
        });
        chai_1.expect(prepareEval.args[0]).to.deep.equal(['!!(error.name == "hi")', { hoist: ['error'] }]);
        chai_1.expect(stubDap.output.called).to.be.false;
        chai_1.expect(stubCdp.Debugger.setPauseOnExceptions.calledWith({ state: 'all' })).to.be.true;
        expr
            .onFirstCall()
            .resolves({ result: { value: true } })
            .onSecondCall()
            .resolves({ result: { value: false } });
        chai_1.expect(await ep.shouldPauseAt({
            callFrames: [objUtils_1.upcastPartial({ callFrameId: '1' })],
            reason: 'exception',
            data: 'oh no!',
        })).to.be.true;
        chai_1.expect(await ep.shouldPauseAt({
            callFrames: [objUtils_1.upcastPartial({ callFrameId: '1' })],
            reason: 'exception',
            data: 'oh no!',
        })).to.be.false;
    });
});
//# sourceMappingURL=exceptionPauseService.test.js.map
//# sourceMappingURL=exceptionPauseService.test.js.map
