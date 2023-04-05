"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.knownToolGlob = exports.knownToolToken = void 0;
/**
 * Globs for tools we can auto attach to.
 */
const knownTools = new Set([
    //#region test runners
    'mocha',
    'jest',
    'jest-cli',
    'ava',
    'tape',
    'tap',
    //#endregion,
    //#region transpilers
    'ts-node',
    'babel-node',
]);
exports.knownToolToken = '$KNOWN_TOOLS$';
exports.knownToolGlob = `{${[...knownTools].join(',')}}`;
//# sourceMappingURL=knownTools.js.map
//# sourceMappingURL=knownTools.js.map
