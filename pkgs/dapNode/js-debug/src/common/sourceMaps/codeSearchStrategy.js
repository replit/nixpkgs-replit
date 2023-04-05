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
var CodeSearchStrategy_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeSearchStrategy = void 0;
const pathUtils_1 = require("../pathUtils");
const nodeSearchStrategy_1 = require("./nodeSearchStrategy");
const sourceMapRepository_1 = require("./sourceMapRepository");
const inversify_1 = require("inversify");
/**
 * A source map repository that uses VS Code's proposed search API to
 * look for candidate files.
 */
let CodeSearchStrategy = CodeSearchStrategy_1 = class CodeSearchStrategy {
    constructor(vscode, logger) {
        this.vscode = vscode;
        this.logger = logger;
        this.nodeStrategy = new nodeSearchStrategy_1.NodeSearchStrategy(this.logger);
    }
    static createOrFallback(logger) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const code = require('vscode');
            if (code.workspace.findTextInFiles !== undefined) {
                return new CodeSearchStrategy_1(code, logger);
            }
        }
        catch (_a) {
            // ignored -- VS won't have vscode as a viable import, fall back to the memory/node.js version
        }
        return new nodeSearchStrategy_1.NodeSearchStrategy(logger);
    }
    /**
     * @inheritdoc
     */
    async streamAllChildren(files, onChild) {
        // see https://github.com/microsoft/vscode/issues/101889
        return this.nodeStrategy.streamAllChildren(files, onChild);
    }
    /**
     * @inheritdoc
     */
    async streamChildrenWithSourcemaps(outFiles, onChild) {
        const todo = [];
        await this.vscode.workspace.findTextInFiles({ pattern: 'sourceMappingURL', isCaseSensitive: true }, Object.assign(Object.assign({}, this.getTextSearchOptions(outFiles)), { previewOptions: { charsPerLine: Number.MAX_SAFE_INTEGER, matchLines: 1 } }), result => {
            const text = 'text' in result ? result.text : result.preview.text;
            todo.push(sourceMapRepository_1.createMetadataForFile(result.uri.fsPath, text)
                .then(parsed => parsed && onChild(parsed))
                .catch(error => this.logger.warn("sourcemap.parsing" /* SourceMapParsing */, 'Error parsing source map', {
                error,
                file: result.uri.fsPath,
            })));
        });
        this.logger.info("sourcemap.parsing" /* SourceMapParsing */, `findTextInFiles search found ${todo.length} files`);
        return (await Promise.all(todo)).filter((t) => t !== undefined);
    }
    getTextSearchOptions(files) {
        return {
            include: new this.vscode.RelativePattern(files.rootPath, pathUtils_1.forceForwardSlashes(files.patterns.filter(p => !p.startsWith('!')).join(', '))),
            exclude: files.patterns
                .filter(p => p.startsWith('!'))
                .map(p => pathUtils_1.forceForwardSlashes(p.slice(1)))
                .join(','),
            useDefaultExcludes: false,
            useIgnoreFiles: false,
            useGlobalIgnoreFiles: false,
            followSymlinks: true,
            beforeContext: 0,
            afterContext: 0,
        };
    }
};
CodeSearchStrategy = CodeSearchStrategy_1 = __decorate([
    inversify_1.injectable()
], CodeSearchStrategy);
exports.CodeSearchStrategy = CodeSearchStrategy;
//# sourceMappingURL=codeSearchStrategy.js.map
//# sourceMappingURL=codeSearchStrategy.js.map
