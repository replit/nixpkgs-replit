"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForPause = exports.eventuallyOk = exports.itIntegrates = void 0;
const child_process = __importStar(require("child_process"));
const del_1 = __importDefault(require("del"));
const path = __importStar(require("path"));
const goldenText_1 = require("./goldenText");
const test_1 = require("./test");
const pathUtils_1 = require("../common/pathUtils");
const promiseUtil_1 = require("../common/promiseUtil");
process.env['DA_TEST_DISABLE_TELEMETRY'] = 'true';
let servers;
before(async () => {
    servers = [
        child_process.fork(path.join(__dirname, 'testServer.js'), ['8001'], { stdio: 'pipe' }),
        child_process.fork(path.join(__dirname, 'testServer.js'), ['8002'], { stdio: 'pipe' }),
    ];
    await Promise.all(servers.map(server => {
        return new Promise((resolve, reject) => {
            var _a, _b;
            let error = '';
            (_a = server.stderr) === null || _a === void 0 ? void 0 : _a.on('data', data => (error += data.toString()));
            (_b = server.stdout) === null || _b === void 0 ? void 0 : _b.on('data', data => (error += data.toString()));
            server.once('error', reject);
            server.once('close', code => reject(new Error(`Exited with ${code}, stderr=${error}`)));
            server.once('message', resolve);
        });
    }));
});
after(async () => {
    servers.forEach(server => server.kill());
    servers = [];
});
const itIntegratesBasic = (test, fn, testFunction = it) => testFunction(test, async function () {
    const golden = new goldenText_1.GoldenText(this.test.titlePath().join(' '), test_1.testWorkspace);
    const root = new test_1.TestRoot(golden, this.test.fullTitle());
    await root.initialize;
    try {
        this.test.goldenText = golden;
        await fn({ golden, r: root, context: this });
    }
    finally {
        try {
            await root.disconnect();
        }
        catch (e) {
            console.warn('Error disconnecting test root:', e);
        }
    }
    if (golden.hasNonAssertedLogs()) {
        throw new Error(`Whoa, test "${test}" has some logs that it did not assert!\n\n${golden.getOutput()}`);
    }
});
itIntegratesBasic.only = (test, fn) => itIntegratesBasic(test, fn, it.only);
itIntegratesBasic.skip = (test, fn) => itIntegratesBasic(test, fn, it.skip);
exports.itIntegrates = itIntegratesBasic;
exports.eventuallyOk = async (fn, timeout = 1000, wait = 10) => {
    const deadline = Date.now() + timeout;
    while (true) {
        try {
            return await fn();
        }
        catch (e) {
            if (Date.now() + wait > deadline) {
                throw e;
            }
            await promiseUtil_1.delay(wait);
        }
    }
};
afterEach(async () => {
    await del_1.default([`${pathUtils_1.forceForwardSlashes(test_1.testFixturesDir)}/**`], {
        force: true /* delete outside cwd */,
    });
});
async function waitForPause(p, cb) {
    const { threadId } = p.log(await p.dap.once('stopped'));
    await p.logger.logStackTrace(threadId);
    await (cb === null || cb === void 0 ? void 0 : cb(threadId));
    return p.dap.continue({ threadId });
}
exports.waitForPause = waitForPause;
//# sourceMappingURL=testIntegrationUtils.js.map
//# sourceMappingURL=testIntegrationUtils.js.map
