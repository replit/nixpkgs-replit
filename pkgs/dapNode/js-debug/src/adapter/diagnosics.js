"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Diagnostics = void 0;
const inversify_1 = require("inversify");
const os_1 = require("os");
const path_1 = require("path");
const objUtils_1 = require("../common/objUtils");
const diagnosticTool_1 = require("../diagnosticTool");
const ioc_extras_1 = require("../ioc-extras");
const targets_1 = require("../targets/targets");
const breakpoints_1 = require("./breakpoints");
const sources_1 = require("./sources");
let Diagnostics = class Diagnostics {
    constructor(fs, sources, breakpoints, target) {
        this.fs = fs;
        this.sources = sources;
        this.breakpoints = breakpoints;
        this.target = target;
    }
    /**
     * Generates the a object containing information
     * about sources, config, and breakpoints.
     */
    async generateObject() {
        const [sources] = await Promise.all([this.dumpSources()]);
        return {
            breakpoints: this.dumpBreakpoints(),
            sources,
            config: this.target.launchConfig,
        };
    }
    /**
     * Generates an HTML diagnostic report.
     */
    async generateHtml(file = path_1.join(os_1.tmpdir(), 'js-debug-diagnostics.html')) {
        await this.fs.writeFile(file, `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
      </head>
      <body>
        <script>window.DUMP=${JSON.stringify(await this.generateObject())}</script>
        <script>${await this.fs.readFile(diagnosticTool_1.toolPath, 'utf-8')}</script>
      </body>
      </html>`);
        return file;
    }
    dumpBreakpoints() {
        const output = [];
        for (const list of [this.breakpoints.appliedByPath, this.breakpoints.appliedByRef]) {
            for (const breakpoints of list.values()) {
                for (const breakpoint of breakpoints) {
                    const dump = breakpoint.diagnosticDump();
                    output.push({
                        source: dump.source,
                        params: dump.params,
                        cdp: dump.cdp.map(bp => bp.state === 1 /* Applied */
                            ? Object.assign(Object.assign({}, bp), { uiLocations: bp.uiLocations.map(l => this.dumpUiLocation(l)) }) : Object.assign(Object.assign({}, bp), { done: undefined })),
                    });
                }
            }
        }
        return output;
    }
    dumpSources() {
        const output = [];
        let idCounter = 0;
        for (const source of this.sources.sources) {
            output.push((async () => ({
                uniqueId: idCounter++,
                url: source.url,
                sourceReference: source.sourceReference,
                absolutePath: source.absolutePath,
                actualAbsolutePath: await source.existingAbsolutePath(),
                scriptIds: source.scriptIds(),
                prettyName: await source.prettyName(),
                compiledSourceRefToUrl: source instanceof sources_1.SourceFromMap
                    ? [...source.compiledToSourceUrl.entries()].map(([k, v]) => [k.sourceReference, v])
                    : undefined,
                sourceMap: source.sourceMap && {
                    url: source.sourceMap.url,
                    metadata: source.sourceMap.metadata,
                    sources: objUtils_1.mapValues(Object.fromEntries(source.sourceMap.sourceByUrl), v => v.sourceReference),
                },
            }))());
        }
        return Promise.all(output);
    }
    dumpUiLocation(location) {
        return {
            lineNumber: location.lineNumber,
            columnNumber: location.columnNumber,
            sourceReference: location.source.sourceReference,
        };
    }
};
Diagnostics = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.FS)),
    __param(1, inversify_1.inject(sources_1.SourceContainer)),
    __param(2, inversify_1.inject(breakpoints_1.BreakpointManager)),
    __param(3, inversify_1.inject(targets_1.ITarget))
], Diagnostics);
exports.Diagnostics = Diagnostics;
//# sourceMappingURL=diagnosics.js.map
//# sourceMappingURL=diagnosics.js.map
