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
exports.RenameMapping = exports.RenameProvider = exports.IRenameProvider = void 0;
const inversify_1 = require("inversify");
const sources_1 = require("../../adapter/sources");
const positions_1 = require("../positions");
const stringUtils_1 = require("../stringUtils");
const sourceMapFactory_1 = require("./sourceMapFactory");
/** Very approximate regex for JS identifiers */
const identifierRe = /[$a-z_][$0-9A-Z_$]*/iy;
exports.IRenameProvider = Symbol('IRenameProvider');
let RenameProvider = class RenameProvider {
    constructor(sourceMapFactory) {
        this.sourceMapFactory = sourceMapFactory;
        this.renames = new Map();
    }
    /**
     * @inheritdoc
     */
    provideOnStackframe(frame) {
        const location = frame.uiLocation();
        if (location === undefined) {
            return RenameMapping.None;
        }
        else if ('then' in location) {
            return location.then(s => this.provideForSource(s === null || s === void 0 ? void 0 : s.source));
        }
        else {
            return this.provideForSource(location === null || location === void 0 ? void 0 : location.source);
        }
    }
    /**
     * @inheritdoc
     */
    provideForSource(source) {
        if (!(source instanceof sources_1.SourceFromMap)) {
            return RenameMapping.None;
        }
        const original = source.compiledToSourceUrl.keys().next().value;
        if (!original) {
            throw new Error('unreachable');
        }
        const cached = this.renames.get(original.url);
        if (cached) {
            return cached;
        }
        const promise = Promise.all([
            this.sourceMapFactory.load(original.sourceMap.metadata),
            original.content(),
        ])
            .then(([sm, content]) => sm && content ? this.createFromSourceMap(sm, content) : RenameMapping.None)
            .catch(() => RenameMapping.None);
        this.renames.set(original.url, promise);
        return promise;
    }
    createFromSourceMap(sourceMap, content) {
        const toOffset = new stringUtils_1.PositionToOffset(content);
        const renames = [];
        // todo: may eventually want to be away
        sourceMap.eachMapping(mapping => {
            if (!mapping.name) {
                return;
            }
            // convert to base 0 columns
            const position = new positions_1.Base01Position(mapping.generatedLine, mapping.generatedColumn);
            const start = toOffset.convert(position);
            identifierRe.lastIndex = start;
            const match = identifierRe.exec(content);
            if (!match) {
                return;
            }
            renames.push({ compiled: match[0], original: mapping.name, position });
        });
        renames.sort((a, b) => a.position.compare(b.position));
        return new RenameMapping(renames);
    }
};
RenameProvider = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(sourceMapFactory_1.ISourceMapFactory))
], RenameProvider);
exports.RenameProvider = RenameProvider;
/**
 * Accessor for mapping of compiled and original source names. This works by
 * getting the rename closest to a compiled position. It would be more
 * correct to parse the AST and use scopes, but doing so is relatively slow.
 * This is probably good enough.
 */
class RenameMapping {
    constructor(renames) {
        this.renames = renames;
    }
    /**
     * Gets the original identifier name from a compiled name, with the
     * interpreter paused at the given position.
     */
    getOriginalName(compiledName, compiledPosition) {
        var _a;
        return (_a = this.getClosestRename(compiledPosition, r => r.compiled === compiledName)) === null || _a === void 0 ? void 0 : _a.original;
    }
    /**
     * Gets the compiled identifier name from an original name.
     */
    getCompiledName(originalName, compiledPosition) {
        var _a;
        return (_a = this.getClosestRename(compiledPosition, r => r.original === originalName)) === null || _a === void 0 ? void 0 : _a.compiled;
    }
    getClosestRename(compiledPosition, filter) {
        const compiled01 = compiledPosition.base01;
        let best;
        for (const rename of this.renames) {
            if (!filter(rename)) {
                continue;
            }
            const isBefore = rename.position.compare(compiled01) < 0;
            if (!isBefore && best) {
                return best;
            }
            best = rename;
        }
        return best;
    }
}
exports.RenameMapping = RenameMapping;
RenameMapping.None = new RenameMapping([]);
//# sourceMappingURL=renameProvider.js.map
//# sourceMappingURL=renameProvider.js.map
