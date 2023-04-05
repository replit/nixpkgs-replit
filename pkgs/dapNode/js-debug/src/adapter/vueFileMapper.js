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
exports.VueFileMapper = exports.IVueFileMapper = void 0;
const inversify_1 = require("inversify");
const sourceMapRepository_1 = require("../common/sourceMaps/sourceMapRepository");
const fileGlobList_1 = require("../common/fileGlobList");
const objUtils_1 = require("../common/objUtils");
const path_1 = require("path");
/**
 * Regex for Vue sources. The input is something like `webpack:///foo.vue?asdf.
 * This pattern does not appear to be configurable in the Vue docs, so doing
 * ahead with 'hardcoding' it here.
 *
 * The first match group is the basename.
 *
 * @see https://cli.vuejs.org/config/#css-requiremoduleextension
 */
const vueSourceUrlRe = /^webpack:\/{3}([^/]+?\.vue)(\?[0-9a-z]*)?$/i;
/**
 * Regex for a vue generated file.
 */
const vueGeneratedRe = /^webpack:\/{3}\.\/.+\.vue\?[0-9a-z]+$/i;
exports.IVueFileMapper = Symbol('IVueFileMapper');
/**
 * Discovers Vue files in the workplace, recording a map of their basenames
 * to their absolute path.
 *
 * We do this because Vue handles their sources a little differently. For
 * each Vue file, several sourcemapped files are generated, but the 'real'
 * sourcemapped file is always at `webpack:///${basename}?${randomStr}`. So
 * we need to be able to look up from basename to absolute path. That's what
 * this mapped provides.
 */
let VueFileMapper = class VueFileMapper {
    constructor(files, search) {
        this.files = files;
        this.search = search;
        this.getMapping = objUtils_1.once(async () => {
            const basenameToPath = new Map();
            await this.search.streamAllChildren(this.files, file => basenameToPath.set(path_1.basename(file), file));
            return basenameToPath;
        });
    }
    /**
     * @inheritdoc
     */
    async lookup(sourceUrl) {
        const match = vueSourceUrlRe.exec(sourceUrl);
        if (!match) {
            return undefined;
        }
        const basenameToPath = await this.getMapping();
        return basenameToPath.get(match[1]);
    }
    /**
     * @inheritdoc
     */
    getVueHandling(sourceUrl) {
        if (this.files.empty) {
            return 0 /* Unhandled */;
        }
        return vueSourceUrlRe.test(sourceUrl)
            ? 1 /* Lookup */
            : vueGeneratedRe.test(sourceUrl)
                ? 2 /* Omit */
                : 0 /* Unhandled */;
    }
};
VueFileMapper = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(fileGlobList_1.VueComponentPaths)),
    __param(1, inversify_1.inject(sourceMapRepository_1.ISearchStrategy))
], VueFileMapper);
exports.VueFileMapper = VueFileMapper;
//# sourceMappingURL=vueFileMapper.js.map
//# sourceMappingURL=vueFileMapper.js.map
