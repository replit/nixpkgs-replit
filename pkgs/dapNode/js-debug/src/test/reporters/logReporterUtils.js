"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogFileForTest = void 0;
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
function getLogFileForTest(testTitlePath) {
    return path_1.default.join(os_1.default.tmpdir(), `${testTitlePath.replace(/[^a-z0-9]/gi, '-')}.json`);
}
exports.getLogFileForTest = getLogFileForTest;
//# sourceMappingURL=logReporterUtils.js.map
//# sourceMappingURL=logReporterUtils.js.map
