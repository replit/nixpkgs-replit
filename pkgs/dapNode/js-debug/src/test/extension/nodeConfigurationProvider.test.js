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
const fs_1 = require("fs");
const path_1 = require("path");
const sinon_1 = require("sinon");
const vscode = __importStar(require("vscode"));
const environmentVars_1 = require("../../common/environmentVars");
const fsUtils_1 = require("../../common/fsUtils");
const nodeDebugConfigurationResolver_1 = require("../../ui/configuration/nodeDebugConfigurationResolver");
const createFileTree_1 = require("../createFileTree");
const test_1 = require("../test");
describe('NodeDebugConfigurationProvider', () => {
    let provider;
    let nvmResolver;
    const folder = {
        uri: vscode.Uri.file(test_1.testFixturesDir),
        name: 'test-dir',
        index: 0,
    };
    beforeEach(() => {
        nvmResolver = { resolveNvmVersionPath: sinon_1.stub() };
        provider = new nodeDebugConfigurationResolver_1.NodeConfigurationResolver({ logPath: test_1.testFixturesDir }, nvmResolver, new fsUtils_1.LocalFsUtils(fs_1.promises));
        environmentVars_1.EnvironmentVars.platform = 'linux';
    });
    afterEach(() => {
        environmentVars_1.EnvironmentVars.platform = process.platform;
    });
    describe('logging resolution', () => {
        const emptyRequest = {
            type: 'node',
            name: '',
            request: '',
        };
        beforeEach(() => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'hello.js': '',
                'package.json': JSON.stringify({ main: 'hello.js' }),
            });
        });
        it('does not log by default', async () => {
            const result = await provider.resolveDebugConfiguration(folder, emptyRequest);
            chai_1.expect(result.trace).to.deep.equal({
                console: false,
                level: 'fatal',
                stdio: false,
                logFile: null,
                tags: [],
            });
        });
        it('applies defaults with trace=true', async () => {
            const result = await provider.resolveDebugConfiguration(folder, Object.assign(Object.assign({}, emptyRequest), { trace: true }));
            chai_1.expect(result.trace).to.containSubset({
                console: false,
                level: 'verbose',
                stdio: true,
                tags: [],
            });
        });
        it('applies overrides', async () => {
            const result = await provider.resolveDebugConfiguration(folder, Object.assign(Object.assign({}, emptyRequest), { trace: {
                    level: 'warn',
                    tags: ['cdp'],
                } }));
            chai_1.expect(result.trace).to.deep.equal({
                console: false,
                level: 'warn',
                logFile: result.trace.logFile,
                stdio: true,
                tags: ['cdp'],
            });
        });
    });
    describe('launch config from context', () => {
        const emptyRequest = {
            type: '',
            name: '',
            request: '',
        };
        it('loads the program from a package.json main if available', async () => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'hello.js': '',
                'package.json': JSON.stringify({ main: 'hello.js' }),
            });
            const result = (await provider.resolveDebugConfiguration(folder, emptyRequest));
            result.cwd = result.cwd.toLowerCase();
            chai_1.expect(result).to.containSubset({
                type: 'pwa-node',
                cwd: test_1.testFixturesDir.toLowerCase(),
                name: 'Launch Program',
                program: path_1.join('${workspaceFolder}', 'hello.js'),
                request: 'launch',
            });
        });
        it('loads the program from a package.json start script if available', async () => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'hello.js': '',
                'package.json': JSON.stringify({ scripts: { start: 'node hello.js' } }),
            });
            const result = (await provider.resolveDebugConfiguration(folder, emptyRequest));
            result.cwd = result.cwd.toLowerCase();
            chai_1.expect(result).to.containSubset({
                type: 'pwa-node',
                cwd: test_1.testFixturesDir.toLowerCase(),
                name: 'Launch Program',
                program: path_1.join('${workspaceFolder}', 'hello.js'),
                request: 'launch',
            });
        });
        it('configures mern starters', async () => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'hello.js': '',
                'package.json': JSON.stringify({ name: 'mern-starter' }),
            });
            const result = await provider.resolveDebugConfiguration(folder, emptyRequest);
            chai_1.expect(result).to.containSubset({
                runtimeExecutable: 'nodemon',
                program: '${workspaceFolder}/index.js',
                restart: true,
                env: { BABEL_DISABLE_CACHE: '1', NODE_ENV: 'development' },
            });
        });
        it('attempts to load the active text editor', async () => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, { 'hello.js': '' });
            const doc = await vscode.workspace.openTextDocument(path_1.join(test_1.testFixturesDir, 'hello.js'));
            await vscode.window.showTextDocument(doc);
            try {
                const result = await provider.resolveDebugConfiguration(folder, emptyRequest);
                chai_1.expect(result).to.containSubset({
                    program: path_1.join('${workspaceFolder}', 'hello.js'),
                });
            }
            finally {
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            }
        });
        it('applies tsconfig settings automatically', async () => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                out: { 'hello.js': '' },
                src: { 'hello.ts': '' },
                'package.json': JSON.stringify({ main: 'out/hello.js' }),
                'tsconfig.json': JSON.stringify({ compilerOptions: { outDir: 'out' } }),
            });
            const doc = await vscode.workspace.openTextDocument(path_1.join(test_1.testFixturesDir, 'src', 'hello.ts'));
            await vscode.window.showTextDocument(doc);
            try {
                const result = await provider.resolveDebugConfiguration(folder, emptyRequest);
                chai_1.expect(result).to.containSubset({
                    program: path_1.join('${workspaceFolder}', 'out', 'hello.js'),
                    preLaunchTask: 'tsc: build - tsconfig.json',
                    outFiles: ['${workspaceFolder}/out/**/*.js'],
                });
            }
            finally {
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            }
        });
    });
    it('attempts to resolve nvm', async () => {
        createFileTree_1.createFileTree(test_1.testFixturesDir, {
            'my.env': 'A=bar\nB="quoted"\n"C"="more quoted"\n\nD=overridden\n',
            'hello.js': '',
        });
        nvmResolver.resolveNvmVersionPath.resolves({
            directory: '/my/node/location',
            binary: 'node64',
        });
        const result = await provider.resolveDebugConfiguration(folder, {
            type: "pwa-node" /* Node */,
            name: '',
            request: 'launch',
            program: 'hello.js',
            runtimeVersion: '3.1.4',
            env: { hello: 'world', PATH: '/usr/bin' },
        });
        chai_1.expect(result).to.containSubset({
            runtimeExecutable: 'node64',
            env: {
                hello: 'world',
                PATH: '/my/node/location:/usr/bin',
            },
        });
    });
    describe('inspect flags', () => {
        it('demaps', async () => {
            const result = (await provider.resolveDebugConfiguration(folder, {
                type: "pwa-node" /* Node */,
                name: '',
                request: 'launch',
                program: 'hello.js',
                runtimeArgs: ['-a', '--inspect-brk', '--b'],
            }));
            chai_1.expect(result.runtimeArgs).to.deep.equal(['-a', '--b']);
            chai_1.expect(result.stopOnEntry).to.be.true;
        });
        it('does not overwrite existing stop on entry', async () => {
            const result = (await provider.resolveDebugConfiguration(folder, {
                type: "pwa-node" /* Node */,
                name: '',
                request: 'launch',
                program: 'hello.js',
                stopOnEntry: 'hello.js',
                runtimeArgs: ['-a', '--inspect-brk', '--b'],
            }));
            chai_1.expect(result.runtimeArgs).to.deep.equal(['-a', '--b']);
            chai_1.expect(result.stopOnEntry).to.equal('hello.js');
        });
        it('assigns a random simple attach port', async () => {
            const result = (await provider.resolveDebugConfiguration(folder, {
                type: "pwa-node" /* Node */,
                name: '',
                request: 'launch',
                program: 'hello.js',
                attachSimplePort: 0,
            }));
            chai_1.expect(result.continueOnAttach).to.be.true;
            chai_1.expect(result.attachSimplePort).to.be.greaterThan(0);
            chai_1.expect(result.runtimeArgs).to.deep.equal([`--inspect-brk=${result.attachSimplePort}`]);
            chai_1.expect(result.continueOnAttach).to.equal(true);
        });
        it('merged picked port with existing runtime args', async () => {
            const result = (await provider.resolveDebugConfiguration(folder, {
                type: "pwa-node" /* Node */,
                name: '',
                request: 'launch',
                program: 'hello.js',
                attachSimplePort: 0,
                runtimeArgs: ['--nolazy'],
            }));
            chai_1.expect(result.runtimeArgs).to.deep.equal([
                '--nolazy',
                `--inspect-brk=${result.attachSimplePort}`,
            ]);
        });
        it('keeps a static attach port', async () => {
            const result = (await provider.resolveDebugConfiguration(folder, {
                type: "pwa-node" /* Node */,
                name: '',
                request: 'launch',
                program: 'hello.js',
                attachSimplePort: 9229,
                runtimeArgs: ['--inspect-brk'],
            }));
            chai_1.expect(result.continueOnAttach).to.be.true;
            chai_1.expect(result.attachSimplePort).to.be.greaterThan(0);
            chai_1.expect(result.runtimeArgs).to.deep.equal(['--inspect-brk']);
            chai_1.expect(result.continueOnAttach).to.equal(true);
        });
        it('adjusts stopOnEntry to continueOnArray', async () => {
            const result = (await provider.resolveDebugConfiguration(folder, {
                type: "pwa-node" /* Node */,
                name: '',
                request: 'launch',
                program: 'hello.js',
                attachSimplePort: 0,
                stopOnEntry: true,
            }));
            chai_1.expect(result.continueOnAttach).to.be.false;
            chai_1.expect(result.stopOnEntry).to.be.false;
        });
    });
    describe('outFiles', () => {
        it('does not modify outfiles with no package.json', async () => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'hello.js': '',
            });
            const result = await provider.resolveDebugConfiguration(folder, {
                type: "pwa-node" /* Node */,
                name: '',
                request: 'launch',
                program: 'hello.js',
            });
            chai_1.expect(result === null || result === void 0 ? void 0 : result.outFiles).to.deep.equal(['${workspaceFolder}/**/*.js', '!**/node_modules/**']);
        });
        it('preserves outFiles if package.json is in the same folder', async () => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'hello.js': '',
                'package.json': '{}',
            });
            const result = await provider.resolveDebugConfiguration(folder, {
                type: "pwa-node" /* Node */,
                name: '',
                request: 'launch',
                program: 'hello.js',
            });
            chai_1.expect(result === null || result === void 0 ? void 0 : result.outFiles).to.deep.equal(['${workspaceFolder}/**/*.js', '!**/node_modules/**']);
        });
        it('gets the nearest nested package.json', async () => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'a/b/c/hello.js': '',
                'a/b/package.json': '{}',
                'a/package.json': '{}',
            });
            const result = await provider.resolveDebugConfiguration(folder, {
                type: "pwa-node" /* Node */,
                name: '',
                request: 'launch',
                program: 'a/b/c/hello.js',
            });
            chai_1.expect(result === null || result === void 0 ? void 0 : result.outFiles).to.deep.equal([
                '${workspaceFolder}/a/b/**/*.js',
                '!**/node_modules/**',
            ]);
        });
        it('does not resolve outside the workspace folder', async () => {
            createFileTree_1.createFileTree(test_1.testFixturesDir, {
                'a/b/c/hello.js': '',
                'package.json': '{}',
            });
            const result = await provider.resolveDebugConfiguration({
                uri: vscode.Uri.file(path_1.join(test_1.testFixturesDir, 'a')),
                name: 'test-dir',
                index: 0,
            }, {
                type: "pwa-node" /* Node */,
                name: '',
                request: 'launch',
                program: 'b/c/hello.js',
            });
            chai_1.expect(result === null || result === void 0 ? void 0 : result.outFiles).to.deep.equal(['${workspaceFolder}/**/*.js', '!**/node_modules/**']);
        });
    });
});
//# sourceMappingURL=nodeConfigurationProvider.test.js.map
//# sourceMappingURL=nodeConfigurationProvider.test.js.map
