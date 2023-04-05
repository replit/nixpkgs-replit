"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchUnelevatedChrome = void 0;
const cancellation_1 = require("../../common/cancellation");
async function launchUnelevatedChrome(dap, chromePath, chromeArgs, cancellationToken) {
    const response = dap.launchUnelevatedRequest({
        process: chromePath,
        args: chromeArgs,
    });
    await cancellation_1.timeoutPromise(response, cancellationToken, 'Could not launch browser unelevated');
}
exports.launchUnelevatedChrome = launchUnelevatedChrome;
//# sourceMappingURL=unelevatedChome.js.map
//# sourceMappingURL=unelevatedChome.js.map
