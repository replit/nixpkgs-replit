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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeSearchStrategy = void 0;
const sourceMapRepository_1 = require("./sourceMapRepository");
const glob_stream_1 = __importDefault(require("glob-stream"));
const logging_1 = require("../logging");
const pathUtils_1 = require("../pathUtils");
const inversify_1 = require("inversify");
/**
 * A source map repository that uses globbing to find candidate files.
 */
let NodeSearchStrategy = class NodeSearchStrategy {
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * @inheritdoc
     */
    async streamAllChildren(files, onChild) {
        const todo = [];
        await new Promise((resolve, reject) => this.globForFiles(files)
            .on('data', (value) => todo.push(onChild(pathUtils_1.fixDriveLetterAndSlashes(value.path))))
            .on('finish', resolve)
            .on('error', reject));
        return (await Promise.all(todo)).filter((t) => t !== undefined);
    }
    /**
     * @inheritdoc
     */
    async streamChildrenWithSourcemaps(files, onChild) {
        const todo = [];
        await new Promise((resolve, reject) => this.globForFiles(files)
            .on('data', (value) => todo.push(sourceMapRepository_1.createMetadataForFile(pathUtils_1.fixDriveLetterAndSlashes(value.path))
            .then(parsed => parsed && onChild(parsed))
            .catch(error => this.logger.warn("sourcemap.parsing" /* SourceMapParsing */, 'Error parsing source map', {
            error,
            file: value.path,
        }))))
            .on('finish', resolve)
            .on('error', reject));
        return (await Promise.all(todo)).filter((t) => t !== undefined);
    }
    globForFiles(files) {
        return glob_stream_1.default([
            ...files.patterns.map(pathUtils_1.forceForwardSlashes),
            // Avoid reading asar files: electron patches in support for them, but
            // if we see an invalid one then it throws a synchronous error that
            // breaks glob. We don't care about asar's here, so just skip that:
            '!**/*.asar/**',
        ], {
            matchBase: true,
            cwd: files.rootPath,
        });
    }
};
NodeSearchStrategy = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(logging_1.ILogger))
], NodeSearchStrategy);
exports.NodeSearchStrategy = NodeSearchStrategy;
//# sourceMappingURL=nodeSearchStrategy.js.map
//# sourceMappingURL=nodeSearchStrategy.js.map
