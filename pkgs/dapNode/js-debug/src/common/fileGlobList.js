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
exports.VueComponentPaths = exports.OutFiles = exports.FileGlobList = void 0;
const inversify_1 = require("inversify");
const path = __importStar(require("path"));
const configuration_1 = require("../configuration");
let FileGlobList = class FileGlobList {
    constructor({ rootPath, patterns }) {
        if (!rootPath || !patterns) {
            this.rootPath = '';
            this.patterns = [];
        }
        else {
            this.rootPath = rootPath;
            this.patterns = patterns.map(p => (path.isAbsolute(p) ? path.relative(rootPath, p) : p));
        }
    }
    /**
     * Returns whether there are any outFiles defined.
     */
    get empty() {
        return this.patterns.length === 0;
    }
};
FileGlobList = __decorate([
    inversify_1.injectable()
], FileGlobList);
exports.FileGlobList = FileGlobList;
/**
 * Wrapper around the `outFiles` for the current launch config.
 */
let OutFiles = class OutFiles extends FileGlobList {
    constructor({ rootPath, outFiles, sourceMaps }) {
        super({ rootPath, patterns: sourceMaps === false ? [] : outFiles });
    }
};
OutFiles = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(configuration_1.AnyLaunchConfiguration))
], OutFiles);
exports.OutFiles = OutFiles;
/**
 * Wrapper around the `vueComponentPaths` for the current launch config.
 */
let VueComponentPaths = class VueComponentPaths extends FileGlobList {
    constructor(cfg) {
        super({
            rootPath: cfg.rootPath,
            patterns: 'vueComponentPaths' in cfg ? cfg.vueComponentPaths : [],
        });
    }
};
VueComponentPaths = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(configuration_1.AnyLaunchConfiguration))
], VueComponentPaths);
exports.VueComponentPaths = VueComponentPaths;
//# sourceMappingURL=fileGlobList.js.map
//# sourceMappingURL=fileGlobList.js.map
