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
exports.SourcePathResolverFactory = exports.NodeOnlyPathResolverFactory = exports.ISourcePathResolverFactory = void 0;
const inversify_1 = require("inversify");
const vueFileMapper_1 = require("../adapter/vueFileMapper");
const fsUtils_1 = require("../common/fsUtils");
const ioc_extras_1 = require("../ioc-extras");
const linkedBreakpointLocation_1 = require("../ui/linkedBreakpointLocation");
const blazorSourcePathResolver_1 = require("./browser/blazorSourcePathResolver");
const browserLaunchParams_1 = require("./browser/browserLaunchParams");
const browserPathResolver_1 = require("./browser/browserPathResolver");
const nodeSourcePathResolver_1 = require("./node/nodeSourcePathResolver");
exports.ISourcePathResolverFactory = Symbol('ISourcePathResolverFactory');
/**
 * Path resolver that works for only Node and requires a more minimal setup,
 * can be used outside of an existing debug session.
 */
let NodeOnlyPathResolverFactory = class NodeOnlyPathResolverFactory {
    constructor(fsUtils, linkedBp) {
        this.fsUtils = fsUtils;
        this.linkedBp = linkedBp;
    }
    create(c, logger) {
        if (c.type === "pwa-node" /* Node */ ||
            c.type === "node-terminal" /* Terminal */ ||
            c.type === "pwa-extensionHost" /* ExtensionHost */) {
            return new nodeSourcePathResolver_1.NodeSourcePathResolver(this.fsUtils, nodeSourcePathResolver_1.NodeSourcePathResolver.shouldWarnAboutSymlinks(c) ? this.linkedBp : undefined, nodeSourcePathResolver_1.NodeSourcePathResolver.getOptions(c), logger);
        }
        throw new Error(`Not usable for type ${c.type}`);
    }
};
NodeOnlyPathResolverFactory = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(fsUtils_1.IFsUtils)),
    __param(1, inversify_1.optional()),
    __param(1, inversify_1.inject(linkedBreakpointLocation_1.ILinkedBreakpointLocation))
], NodeOnlyPathResolverFactory);
exports.NodeOnlyPathResolverFactory = NodeOnlyPathResolverFactory;
let SourcePathResolverFactory = class SourcePathResolverFactory {
    constructor(initializeParams, vueMapper, fsUtils, linkedBp) {
        this.initializeParams = initializeParams;
        this.vueMapper = vueMapper;
        this.fsUtils = fsUtils;
        this.linkedBp = linkedBp;
    }
    create(c, logger) {
        if (c.type === "pwa-node" /* Node */ ||
            c.type === "node-terminal" /* Terminal */ ||
            c.type === "pwa-extensionHost" /* ExtensionHost */) {
            return new nodeSourcePathResolver_1.NodeSourcePathResolver(this.fsUtils, nodeSourcePathResolver_1.NodeSourcePathResolver.shouldWarnAboutSymlinks(c) ? this.linkedBp : undefined, nodeSourcePathResolver_1.NodeSourcePathResolver.getOptions(c), logger);
        }
        else {
            const isBlazor = !!c.inspectUri;
            return new (isBlazor ? blazorSourcePathResolver_1.BlazorSourcePathResolver : browserPathResolver_1.BrowserSourcePathResolver)(this.vueMapper, this.fsUtils, {
                resolveSourceMapLocations: c.resolveSourceMapLocations,
                baseUrl: browserLaunchParams_1.baseURL(c),
                localRoot: null,
                remoteRoot: null,
                pathMapping: Object.assign({ '/': c.webRoot }, c.pathMapping),
                sourceMapOverrides: c.sourceMapPathOverrides,
                clientID: this.initializeParams.clientID,
                remoteFilePrefix: c.__remoteFilePrefix,
            }, logger);
        }
    }
};
SourcePathResolverFactory = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.IInitializeParams)),
    __param(1, inversify_1.inject(vueFileMapper_1.IVueFileMapper)),
    __param(2, inversify_1.inject(fsUtils_1.IFsUtils)),
    __param(3, inversify_1.optional()),
    __param(3, inversify_1.inject(linkedBreakpointLocation_1.ILinkedBreakpointLocation))
], SourcePathResolverFactory);
exports.SourcePathResolverFactory = SourcePathResolverFactory;
//# sourceMappingURL=sourcePathResolverFactory.js.map
//# sourceMappingURL=sourcePathResolverFactory.js.map
