"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const logger_1 = require("../../common/logging/logger");
describe('Logger', () => {
    let sink;
    let logger;
    beforeEach(() => {
        sink = { write: sinon_1.stub(), setup: sinon_1.stub().resolves(), dispose: sinon_1.stub() };
        logger = new logger_1.Logger();
    });
    it('buffers and logs messages once sinks are attached', async () => {
        logger.verbose("runtime" /* Runtime */, 'Hello world!');
        await logger.setup({ level: 0 /* Verbose */, sinks: [sink], showWelcome: false });
        chai_1.expect(sink.write.args[0][0]).to.containSubset({
            tag: "runtime" /* Runtime */,
            message: 'Hello world!',
            level: 0 /* Verbose */,
        });
    });
    it('applies level filters before and after attach', async () => {
        logger.verbose("runtime" /* Runtime */, 'a');
        logger.warn("runtime" /* Runtime */, 'b');
        await logger.setup({ level: 2 /* Warn */, sinks: [sink], showWelcome: false });
        logger.verbose("runtime" /* Runtime */, 'c');
        logger.warn("runtime" /* Runtime */, 'd');
        chai_1.expect(sink.write.args.map(a => a[0].message)).to.deep.equal(['b', 'd']);
    });
    it('applies tag filters before and after attach', async () => {
        logger.verbose("dap.send" /* DapSend */, 'a');
        logger.warn("runtime" /* Runtime */, 'b');
        logger.warn("runtime.exception" /* RuntimeException */, 'c');
        await logger.setup({
            level: 0 /* Verbose */,
            tags: ["runtime" /* Runtime */],
            sinks: [sink],
            showWelcome: false,
        });
        logger.verbose("dap.send" /* DapSend */, 'd');
        logger.warn("runtime" /* Runtime */, 'e');
        logger.warn("runtime.exception" /* RuntimeException */, 'f');
        chai_1.expect(sink.write.args.map(a => a[0].message)).to.deep.equal(['b', 'c', 'e', 'f']);
    });
});
//# sourceMappingURL=logging.test.js.map
//# sourceMappingURL=logging.test.js.map
