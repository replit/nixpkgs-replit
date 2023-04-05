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
exports.TestRoot = exports.NodeTestHandle = exports.TestP = exports.removePrivatePrefix = exports.testFixturesDir = exports.testFixturesDirName = exports.testSources = exports.testWorkspace = exports.workspaceFolder = exports.kStabilizeNames = void 0;
const del_1 = __importDefault(require("del"));
const gulp = __importStar(require("gulp"));
const os_1 = require("os");
const path = __importStar(require("path"));
const playwright_1 = __importDefault(require("playwright"));
const stream = __importStar(require("stream"));
const debugAdapter_1 = require("../adapter/debugAdapter");
const binder_1 = require("../binder");
const events_1 = require("../common/events");
const logging_1 = require("../common/logging");
const objUtils_1 = require("../common/objUtils");
const pathUtils_1 = require("../common/pathUtils");
const utils = __importStar(require("../common/urlUtils"));
const configuration_1 = require("../configuration");
const connection_1 = __importDefault(require("../dap/connection"));
const transport_1 = require("../dap/transport");
const ioc_1 = require("../ioc");
const browserTargets_1 = require("../targets/browser/browserTargets");
const targetOrigin_1 = require("../targets/targetOrigin");
const logger_1 = require("./logger");
const logReporterUtils_1 = require("./reporters/logReporterUtils");
exports.kStabilizeNames = ['id', 'threadId', 'sourceReference', 'variablesReference'];
exports.workspaceFolder = path.join(__dirname, '..', '..', '..');
exports.testWorkspace = path.join(exports.workspaceFolder, 'testWorkspace');
exports.testSources = path.join(exports.workspaceFolder, 'src');
exports.testFixturesDirName = '.dynamic-testWorkspace';
exports.testFixturesDir = path.join(exports.workspaceFolder, exports.testFixturesDirName);
/**
 * Replaces the `/private` folder prefix, which OS X likes to add for the
 * user's tmpdir while require('os').tmpdir() returns the path without
 * the prefix, which causes mismatch.
 */
exports.removePrivatePrefix = (folder) => process.platform === 'darwin' ? folder.replace(/^\/private/, '') : folder;
class Stream extends stream.Duplex {
    _write(chunk, encoding, callback) {
        Promise.resolve()
            .then()
            .then()
            .then()
            .then()
            .then()
            .then()
            .then()
            .then()
            .then()
            .then()
            .then(() => {
            this.push(chunk, encoding);
            callback();
        });
    }
    _read(size) {
        // no-op
    }
}
class Session {
    constructor(logger) {
        const testToAdapter = new Stream();
        const adapterToTest = new Stream();
        this.adapterConnection = new connection_1.default(new transport_1.StreamDapTransport(testToAdapter, adapterToTest, logger), logger);
        const testConnection = new connection_1.default(new transport_1.StreamDapTransport(adapterToTest, testToAdapter, logger), logger);
        this.dap = testConnection.createTestApi();
    }
    async _init() {
        await this.adapterConnection.dap();
        const [r] = await Promise.all([
            this.dap.initialize({
                clientID: 'pwa-test',
                adapterID: 'pwa',
                linesStartAt1: true,
                columnsStartAt1: true,
                pathFormat: 'path',
                supportsVariablePaging: true,
            }),
            this.dap.once('initialized'),
        ]);
        return r;
    }
}
class TestP {
    constructor(root, target) {
        this._evaluateCounter = 0;
        this._root = root;
        this._target = target;
        this.log = root.log;
        this.assertLog = root.assertLog;
        this._session = new Session(root.logger);
        this.dap = this._session.dap;
        this.logger = new logger_1.Logger(this.dap, this.log);
    }
    get cdp() {
        return this._cdp;
    }
    get adapter() {
        return this._adapter;
    }
    async evaluate(expression, sourceUrl) {
        ++this._evaluateCounter;
        this.log(`Evaluating#${this._evaluateCounter}: ${expression}`);
        if (sourceUrl === undefined)
            sourceUrl = `//# sourceURL=eval${this._evaluateCounter}.js`;
        else if (sourceUrl)
            sourceUrl = `//# sourceURL=${this.completeUrl(sourceUrl)}`;
        return this._cdp.Runtime.evaluate({ expression: expression + `\n${sourceUrl}` }).then(result => {
            if (!result) {
                this.log(expression, 'Error evaluating');
                debugger;
                throw new Error('Error evaluating "' + expression + '"');
            }
            else if (result.exceptionDetails) {
                this.log(result.exceptionDetails, 'Error evaluating');
                debugger;
                throw new Error('Error evaluating "' + expression + '"');
            }
            return result;
        });
    }
    async addScriptTag(relativePath) {
        await this._cdp.Runtime.evaluate({
            expression: `
      new Promise(f => {
        var script = document.createElement('script');
        script.src = '${this._root.completeUrl(relativePath)}';
        script.onload = () => f(undefined);
        document.head.appendChild(script);
      })
    `,
            awaitPromise: true,
        });
    }
    waitForSource(filter) {
        return this.dap.once('loadedSource', event => {
            return filter === undefined || (event.source.path || '').indexOf(filter) !== -1;
        });
    }
    completeUrl(relativePath) {
        return this._root.completeUrl(relativePath);
    }
    workspacePath(relative) {
        return this._root.workspacePath(relative);
    }
    async _init(adapter, _target, launcher) {
        var _a;
        adapter.breakpointManager.setPredictorDisabledForTest(true);
        adapter.sourceContainer.setSourceMapTimeouts({
            load: 0,
            resolveLocation: 2000,
            sourceMapMinPause: 1000,
            output: 3000,
            sourceMapCumulativePause: 10000,
        });
        this._adapter = adapter;
        this._root._browserLauncher = launcher;
        this._connection = (_a = this._root._browserLauncher) === null || _a === void 0 ? void 0 : _a.connectionForTest();
        const result = await this._connection.rootSession().Target.attachToBrowserTarget({});
        const testSession = this._connection.createSession(result.sessionId);
        const { sessionId } = (await testSession.Target.attachToTarget({
            targetId: this._target instanceof browserTargets_1.BrowserTarget ? this._target.targetId : this._target.id(),
            flatten: true,
        }));
        this._cdp = this._connection.createSession(sessionId);
        await this._session._init();
        if (this._target.parent()) {
            this.dap.configurationDone({});
            this.dap.attach({});
        }
        return false;
    }
    async load() {
        await this.dap.configurationDone({});
        await this.dap.attach({});
        this._cdp.Page.enable({});
        this._cdp.Page.navigate({ url: this._root._launchUrl });
        await new Promise(f => this._cdp.Page.on('loadEventFired', f));
        await this._cdp.Page.disable({});
    }
}
exports.TestP = TestP;
class NodeTestHandle {
    constructor(root, target) {
        this._root = root;
        this._target = target;
        this.log = root.log;
        this.assertLog = root.assertLog;
        this._session = new Session(root.logger);
        this.dap = this._session.dap;
        this.logger = new logger_1.Logger(this.dap, this.log);
    }
    get cdp() {
        return this._cdp;
    }
    get adapter() {
        return this._adapter;
    }
    waitForSource(filter) {
        return this.dap.once('loadedSource', event => {
            return filter === undefined || pathUtils_1.forceForwardSlashes(event.source.path || '').includes(filter);
        });
    }
    workspacePath(relative) {
        return this._root.workspacePath(relative);
    }
    async _init(adapter, target) {
        this._adapter = adapter;
        await this._session._init();
        if (this._target.parent()) {
            this.dap.configurationDone({});
            this.dap.attach({});
        }
        return true;
    }
    async load() {
        await this.dap.configurationDone({});
    }
}
exports.NodeTestHandle = NodeTestHandle;
class TestRoot {
    constructor(goldenText, _testTitlePath) {
        this._testTitlePath = _testTitlePath;
        this._targetToP = new Map();
        this._onSessionCreatedEmitter = new events_1.EventEmitter();
        this.onSessionCreated = this._onSessionCreatedEmitter.event;
        this._args = ['--headless'];
        this.log = goldenText.log.bind(goldenText);
        this.assertLog = goldenText.assertLog.bind(goldenText);
        this._workspaceRoot = utils.platformPathToPreferredCase(path.join(__dirname, '..', '..', '..', 'testWorkspace'));
        this._webRoot = path.join(this._workspaceRoot, 'web');
        const storagePath = path.join(__dirname, '..', '..');
        // todo: make a more proper mock here
        const workspaceState = new Map();
        const services = ioc_1.createTopLevelSessionContainer(ioc_1.createGlobalContainer({
            storagePath,
            isVsCode: true,
            context: objUtils_1.upcastPartial({
                workspaceState: {
                    get(key, defaultValue) {
                        var _a;
                        return (_a = workspaceState.get(key)) !== null && _a !== void 0 ? _a : defaultValue;
                    },
                    update(key, value) {
                        workspaceState.set(key, value);
                        return Promise.resolve();
                    },
                },
            }),
        }));
        this.logger = services.get(logging_1.ILogger);
        this._root = new Session(this.logger);
        this._root.adapterConnection.dap().then(dap => {
            dap.on('initialize', async () => {
                dap.initialized({});
                return debugAdapter_1.DebugAdapter.capabilities();
            });
            dap.on('configurationDone', async () => {
                return {};
            });
        });
        this.binder = new binder_1.Binder(this, this._root.adapterConnection, services, new targetOrigin_1.TargetOrigin('0'));
        this.initialize = this._root._init();
        this._launchCallback = () => { };
        this._workerCallback = () => { };
        this._worker = new Promise(f => (this._workerCallback = f));
    }
    async acquireDap(target) {
        const p = target.type() === 'page' ? new TestP(this, target) : new NodeTestHandle(this, target);
        this._targetToP.set(target, p);
        return p._session.adapterConnection;
    }
    async initAdapter(adapter, target, launcher) {
        const p = this._targetToP.get(target);
        if (!p) {
            return true;
        }
        const boot = await p._init(adapter, target, launcher);
        if (target.parent())
            this._workerCallback(p);
        else
            this._launchCallback(p);
        this._onSessionCreatedEmitter.fire(p);
        return boot;
    }
    releaseDap(target) {
        this._targetToP.delete(target);
    }
    setArgs(args) {
        this._args = args;
    }
    worker() {
        return this._worker;
    }
    /**
     * Returns the root session DAP connection.
     */
    rootDap() {
        return this._root.dap;
    }
    async waitForTopLevel() {
        const result = await new Promise(f => (this._launchCallback = f));
        return result;
    }
    async _launch(url, options = {}) {
        await this.initialize;
        this._launchUrl = url;
        const tmpLogPath = logReporterUtils_1.getLogFileForTest(this._testTitlePath);
        this._root.dap.launch(Object.assign(Object.assign(Object.assign({}, configuration_1.chromeLaunchConfigDefaults), { url, runtimeArgs: this._args, webRoot: this._webRoot, rootPath: this._workspaceRoot, skipNavigateForTest: true, trace: { logFile: tmpLogPath }, runtimeExecutable: playwright_1.default.chromium.executablePath(), outFiles: [`${this._workspaceRoot}/**/*.js`, '!**/node_modules/**'], __workspaceFolder: this._workspaceRoot, cleanUp: 'wholeBrowser' }), options));
        const result = await new Promise(f => (this._launchCallback = f));
        return result;
    }
    async runScript(filename, options = {}) {
        await this.initialize;
        this._launchUrl = path.isAbsolute(filename) ? filename : path.join(exports.testFixturesDir, filename);
        const tmpLogPath = logReporterUtils_1.getLogFileForTest(this._testTitlePath);
        this._root.dap.launch(Object.assign({ type: "pwa-node" /* Node */, request: 'launch', name: 'Test Case', cwd: path.dirname(exports.testFixturesDir), program: this._launchUrl, rootPath: this._workspaceRoot, trace: { logFile: tmpLogPath }, outFiles: [`${this._workspaceRoot}/**/*.js`, '!**/node_modules/**'], resolveSourceMapLocations: ['**', '!**/node_modules/**'], __workspaceFolder: this._workspaceRoot }, options));
        const result = await new Promise(f => (this._launchCallback = f));
        return result;
    }
    /**
     * Runs a script in a separate workspace (i.e. a different 'remoteRoot')
     * from the original file, by copying the containing folder of the file
     * into a temporary directory.
     */
    async runScriptAsRemote(filename, options = {}) {
        await this.initialize;
        filename = path.isAbsolute(filename) ? filename : path.join(exports.testFixturesDir, filename);
        let tmpPath = path.join(os_1.tmpdir(), 'js-debug-test');
        if (process.platform === 'darwin' && tmpPath.startsWith('/var/folders')) {
            // on OSX, tmpdir is 'virtually' inside /private. os.tmpdir() omits the
            // private prefix, but Chrome sees it, so make sure it matches here.
            tmpPath = `/private/${tmpPath}`;
        }
        after(() => del_1.default(`${pathUtils_1.forceForwardSlashes(tmpPath)}/**`, { force: true }));
        await new Promise((resolve, reject) => gulp
            .src('**/*.*', { cwd: path.dirname(filename) })
            .pipe(gulp.dest(tmpPath))
            .on('end', resolve)
            .on('error', reject));
        this._root.dap.launch(Object.assign(Object.assign(Object.assign({}, configuration_1.nodeLaunchConfigDefaults), { cwd: path.dirname(exports.testFixturesDir), program: path.join(tmpPath, path.basename(filename)), localRoot: path.dirname(filename), remoteRoot: tmpPath, trace: { logFile: logReporterUtils_1.getLogFileForTest(this._testTitlePath) }, outFiles: [], resolveSourceMapLocations: ['**', '!**/node_modules/**'], env: {
                NODE_PATH: [
                    process.env.NODE_PATH,
                    path.resolve(path.dirname(filename), 'node_modules'),
                    path.resolve(exports.workspaceFolder, 'node_modules'),
                ]
                    .filter(Boolean)
                    .join(process.platform === 'win32' ? ';' : ':'),
            }, __workspaceFolder: this._workspaceRoot }), options));
        const result = await new Promise(f => (this._launchCallback = f));
        return result;
    }
    async attachNode(processId, options = {}) {
        await this.initialize;
        this._launchUrl = `process${processId}`;
        this._root.dap.launch(Object.assign(Object.assign(Object.assign({}, configuration_1.nodeAttachConfigDefaults), { trace: { logFile: logReporterUtils_1.getLogFileForTest(this._testTitlePath) }, processId: `inspector${processId}`, __workspaceFolder: this._workspaceRoot }), options));
        const result = await new Promise(f => (this._launchCallback = f));
        return result;
    }
    async launch(content, options = {}) {
        const url = 'data:text/html;base64,' + Buffer.from(content).toString('base64');
        return this._launch(url, options);
    }
    async launchAndLoad(content, options = {}) {
        const url = 'data:text/html;base64,' + Buffer.from(content).toString('base64');
        const p = await this._launch(url, options);
        await p.load();
        return p;
    }
    buildUrl(url) {
        return utils.completeUrl('http://localhost:8001/', url) || url;
    }
    async launchUrl(url, options = {}) {
        return await this._launch(this.buildUrl(url), options);
    }
    async launchUrlAndLoad(url, options = {}) {
        const p = await this._launch(this.buildUrl(url), options);
        await p.load();
        return p;
    }
    async disconnect() {
        return new Promise(cb => {
            this.initialize.then(() => {
                var _a;
                const connection = (_a = this._browserLauncher) === null || _a === void 0 ? void 0 : _a.connectionForTest();
                if (connection) {
                    const disposable = connection.onDisconnected(() => {
                        cb();
                        disposable.dispose();
                    });
                }
                else {
                    cb();
                }
                this._root.dap.disconnect({});
                this.binder.dispose();
            });
        });
    }
    completeUrl(relativePath) {
        return utils.completeUrl(this._launchUrl, relativePath) || '';
    }
    workspacePath(relative) {
        return path.join(this._workspaceRoot, relative);
    }
}
exports.TestRoot = TestRoot;
//# sourceMappingURL=test.js.map
//# sourceMappingURL=test.js.map
