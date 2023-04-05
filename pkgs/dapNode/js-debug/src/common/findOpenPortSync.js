"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOpenPortSync = void 0;
const child_process_1 = require("child_process");
const random_1 = require("./random");
var findOpenPort_1 = require("./findOpenPort");
Object.defineProperty(exports, "acquirePortNumber", { enumerable: true, get: function () { return findOpenPort_1.acquirePortNumber; } });
function findOpenPortSync({ min = 53000 /* Min */, max = 54000 /* Max */, attempts = 1000, } = {}) {
    const tester = makeTester();
    let port = random_1.randomInRange(min, max);
    for (let i = Math.min(attempts, max - min); i >= 0; i--) {
        if (tester(port)) {
            return port;
        }
        port = port === max - 1 ? min : port + 1;
    }
    throw new Error('No open port found');
}
exports.findOpenPortSync = findOpenPortSync;
const makeTester = () => {
    const testFast = (port) => {
        var _a;
        const r = child_process_1.spawnSync('nc', ['-z', '127.0.0.1', String(port)]);
        if (((_a = r.error) === null || _a === void 0 ? void 0 : _a.code) === 'ENOENT') {
            tester = testSlow;
        }
        return r.status === 1;
    };
    const testSlow = (port) => {
        /*
        require('net')
          .createServer()
          .on('listening', () => process.exit(0))
          .on('error', () => process.exit(1))
          .listen(+process.env.PORT)
        */
        const r = child_process_1.spawnSync(process.execPath, [
            '-e',
            `require("net").createServer().on("listening",()=>process.exit(0)).on("error",()=>process.exit(1)).listen(+process.env.PORT)`,
        ], {
            env: Object.assign(Object.assign({}, process.env), { PORT: String(port), NODE_OPTIONS: undefined, ELECTRON_RUN_AS_NODE: '1' }),
        });
        return r.status === 0;
    };
    let tester = process.platform === 'win32' ? testSlow : testFast;
    return (port) => tester(port);
};
//# sourceMappingURL=findOpenPortSync.js.map
//# sourceMappingURL=findOpenPortSync.js.map
