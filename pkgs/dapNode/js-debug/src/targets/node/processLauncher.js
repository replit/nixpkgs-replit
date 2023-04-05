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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNodeLaunchArgs = exports.IProgramLauncher = void 0;
const path = __importStar(require("path"));
exports.IProgramLauncher = Symbol('IProgramLauncher');
exports.getNodeLaunchArgs = (config) => {
    let program = config.program;
    if (program && path.isAbsolute(program)) {
        const maybeRel = path.relative(config.cwd, program);
        program = path.isAbsolute(maybeRel) ? maybeRel : `.${path.sep}${maybeRel}`;
    }
    return program
        ? [...config.runtimeArgs, program, ...config.args]
        : [...config.runtimeArgs, ...config.args];
};
//# sourceMappingURL=processLauncher.js.map
//# sourceMappingURL=processLauncher.js.map
