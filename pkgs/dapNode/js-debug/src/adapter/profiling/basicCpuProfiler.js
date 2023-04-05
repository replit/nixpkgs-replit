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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasicCpuProfiler = void 0;
const nls = __importStar(require("vscode-nls"));
const inversify_1 = require("inversify");
const connection_1 = require("../../cdp/connection");
const events_1 = require("../../common/events");
const errors_1 = require("../../dap/errors");
const protocolError_1 = require("../../dap/protocolError");
const ioc_extras_1 = require("../../ioc-extras");
const sources_1 = require("../sources");
const configuration_1 = require("../../configuration");
const localize = nls.loadMessageBundle();
/**
 * Basic profiler that uses the stable CPU `Profiler` API available everywhere.
 * In Chrome, and probably in Node, this will be superceded by the Tracing API.
 */
let BasicCpuProfiler = class BasicCpuProfiler {
    constructor(cdp, fs, sources, launchConfig) {
        this.cdp = cdp;
        this.fs = fs;
        this.sources = sources;
        this.launchConfig = launchConfig;
    }
    static canApplyTo() {
        return true; // this API is stable in all targets
    }
    /**
     * @inheritdoc
     */
    async start(_options, file) {
        await this.cdp.Profiler.enable({});
        if (!(await this.cdp.Profiler.start({}))) {
            throw new protocolError_1.ProtocolError(errors_1.profileCaptureError());
        }
        return new BasicProfile(this.cdp, this.fs, this.sources, this.launchConfig.__workspaceFolder, file);
    }
};
BasicCpuProfiler.type = 'cpu';
BasicCpuProfiler.extension = '.cpuprofile';
BasicCpuProfiler.label = localize('profile.cpu.label', 'CPU Profile');
BasicCpuProfiler.description = localize('profile.cpu.description', 'Generates a .cpuprofile file you can open in the Chrome devtools');
BasicCpuProfiler = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(connection_1.ICdpApi)),
    __param(1, inversify_1.inject(ioc_extras_1.FS)),
    __param(2, inversify_1.inject(sources_1.SourceContainer)),
    __param(3, inversify_1.inject(configuration_1.AnyLaunchConfiguration))
], BasicCpuProfiler);
exports.BasicCpuProfiler = BasicCpuProfiler;
class BasicProfile {
    constructor(cdp, fs, sources, workspaceFolder, file) {
        this.cdp = cdp;
        this.fs = fs;
        this.sources = sources;
        this.workspaceFolder = workspaceFolder;
        this.file = file;
        this.stopEmitter = new events_1.EventEmitter();
        this.disposed = false;
        /**
         * @inheritdoc
         */
        this.onUpdate = new events_1.EventEmitter().event;
        /**
         * @inheritdoc
         */
        this.onStop = this.stopEmitter.event;
    }
    /**
     * @inheritdoc
     */
    async dispose() {
        if (!this.disposed) {
            this.disposed = true;
            await this.cdp.Profiler.disable({});
            this.stopEmitter.fire();
        }
    }
    /**
     * @inheritdoc
     */
    async stop() {
        const result = await this.cdp.Profiler.stop({});
        if (!result) {
            throw new protocolError_1.ProtocolError(errors_1.profileCaptureError());
        }
        await this.dispose();
        const annotated = await this.annotateSources(result.profile);
        await this.fs.writeFile(this.file, JSON.stringify(annotated));
    }
    /**
     * Adds source locations
     */
    async annotateSources(profile) {
        let locationIdCounter = 0;
        const locationsByRef = new Map();
        const getLocationIdFor = (callFrame) => {
            const ref = [
                callFrame.functionName,
                callFrame.url,
                callFrame.scriptId,
                callFrame.lineNumber,
                callFrame.columnNumber,
            ].join(':');
            const existing = locationsByRef.get(ref);
            if (existing) {
                return existing.id;
            }
            const id = locationIdCounter++;
            locationsByRef.set(ref, {
                id,
                callFrame,
                locations: (async () => {
                    var _a;
                    const source = await ((_a = this.sources.scriptsById.get(callFrame.scriptId)) === null || _a === void 0 ? void 0 : _a.source);
                    if (!source) {
                        return [];
                    }
                    return Promise.all(this.sources
                        .currentSiblingUiLocations({
                        lineNumber: callFrame.lineNumber + 1,
                        columnNumber: callFrame.columnNumber + 1,
                        source,
                    })
                        .map(async (loc) => (Object.assign(Object.assign({}, loc), { source: await loc.source.toDapShallow() }))));
                })(),
            });
            return id;
        };
        const nodes = profile.nodes.map(node => {
            var _a;
            return (Object.assign(Object.assign({}, node), { locationId: getLocationIdFor(node.callFrame), positionTicks: (_a = node.positionTicks) === null || _a === void 0 ? void 0 : _a.map(tick => (Object.assign(Object.assign({}, tick), { 
                    // weirdly, line numbers here are 1-based, not 0-based. The position tick
                    // only gives line-level granularity, so 'mark' the entire range of source
                    // code the tick refers to
                    startLocationId: getLocationIdFor(Object.assign(Object.assign({}, node.callFrame), { lineNumber: tick.line - 1, columnNumber: 0 })), endLocationId: getLocationIdFor(Object.assign(Object.assign({}, node.callFrame), { lineNumber: tick.line, columnNumber: 0 })) }))) }));
        });
        return Object.assign(Object.assign({}, profile), { nodes, $vscode: {
                rootPath: this.workspaceFolder,
                locations: await Promise.all([...locationsByRef.values()]
                    .sort((a, b) => a.id - b.id)
                    .map(async (l) => ({ callFrame: l.callFrame, locations: await l.locations }))),
            } });
    }
}
//# sourceMappingURL=basicCpuProfiler.js.map
//# sourceMappingURL=basicCpuProfiler.js.map
