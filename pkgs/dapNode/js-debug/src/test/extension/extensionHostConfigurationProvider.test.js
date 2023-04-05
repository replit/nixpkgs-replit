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
const chai_1 = require("chai");
const path_1 = require("path");
const vscode = __importStar(require("vscode"));
const environmentVars_1 = require("../../common/environmentVars");
const extensionHostConfigurationResolver_1 = require("../../ui/configuration/extensionHostConfigurationResolver");
const test_1 = require("../test");
const createFileTree_1 = require("../createFileTree");
describe('ExtensionHostConfigurationProvider', () => {
    let provider;
    const folder = (name) => ({
        uri: vscode.Uri.file(path_1.join(test_1.testFixturesDir, name)),
        name: 'test-dir',
        index: 0,
    });
    const emptyRequest = {
        type: "pwa-extensionHost" /* ExtensionHost */,
        name: '',
        request: '',
        args: ['--extensionDevelopmentPath=${workspaceFolder}'],
    };
    beforeEach(() => {
        provider = new extensionHostConfigurationResolver_1.ExtensionHostConfigurationResolver({ logPath: test_1.testFixturesDir });
        environmentVars_1.EnvironmentVars.platform = 'linux';
    });
    describe('web worker debugging', () => {
        beforeEach(() => createFileTree_1.createFileTree(test_1.testFixturesDir, {
            'withWeb/package.json': JSON.stringify({ extensionKind: ['web'] }),
            'withoutWeb/package.json': JSON.stringify({}),
        }));
        it('does not enable if no args', async () => {
            const result = await provider.resolveDebugConfiguration(folder('withWeb'), Object.assign(Object.assign({}, emptyRequest), { args: [] }));
            chai_1.expect(result === null || result === void 0 ? void 0 : result.debugWebWorkerHost).to.be.false;
        });
        it('does not enable if wrong type', async () => {
            const result = await provider.resolveDebugConfiguration(folder('withoutWeb'), emptyRequest);
            chai_1.expect(result === null || result === void 0 ? void 0 : result.debugWebWorkerHost).to.be.false;
        });
        it('does not enable if enoent folder', async () => {
            const result = await provider.resolveDebugConfiguration(folder('doesNotExist'), emptyRequest);
            chai_1.expect(result === null || result === void 0 ? void 0 : result.debugWebWorkerHost).to.be.false;
        });
        it('does not override existing option', async () => {
            const result = await provider.resolveDebugConfiguration(folder('doesNotExist'), Object.assign(Object.assign({}, emptyRequest), { debugWebWorkerHost: true }));
            chai_1.expect(result === null || result === void 0 ? void 0 : result.debugWebWorkerHost).to.be.true;
        });
        it('enables if all good', async () => {
            const result = await provider.resolveDebugConfiguration(folder('withWeb'), emptyRequest);
            chai_1.expect(result === null || result === void 0 ? void 0 : result.debugWebWorkerHost).to.be.true;
        });
    });
});
//# sourceMappingURL=extensionHostConfigurationProvider.test.js.map
//# sourceMappingURL=extensionHostConfigurationProvider.test.js.map
