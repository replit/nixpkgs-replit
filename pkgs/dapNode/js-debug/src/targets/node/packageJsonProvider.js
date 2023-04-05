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
exports.PackageJsonProvider = exports.noPackageJsonProvider = exports.IPackageJsonProvider = void 0;
const inversify_1 = require("inversify");
const path_1 = require("path");
const fsUtils_1 = require("../../common/fsUtils");
const objUtils_1 = require("../../common/objUtils");
const urlUtils_1 = require("../../common/urlUtils");
const configuration_1 = require("../../configuration");
exports.IPackageJsonProvider = Symbol('IPackageJsonProvider');
/**
 * A package.json provider that never returns path or contents.
 */
exports.noPackageJsonProvider = {
    getPath: () => Promise.resolve(undefined),
    getContents: () => Promise.resolve(undefined),
};
let PackageJsonProvider = class PackageJsonProvider {
    constructor(fs, config) {
        this.fs = fs;
        this.config = config;
        /**
         * Gets the package.json for the debugged program.
         */
        this.getPath = objUtils_1.once(async () => {
            if (this.config.type !== "pwa-node" /* Node */ || this.config.request !== 'launch') {
                return;
            }
            const dir = await urlUtils_1.nearestDirectoryContaining(this.fs, this.config.cwd, 'package.json');
            return dir ? path_1.join(dir, 'package.json') : undefined;
        });
        /**
         * Gets the package.json contents for the debugged program.
         */
        this.getContents = objUtils_1.once(async () => {
            const path = await this.getPath();
            if (!path) {
                return;
            }
            try {
                const contents = await this.fs.readFile(path);
                return JSON.parse(contents.toString());
            }
            catch (_a) {
                return;
            }
        });
    }
};
PackageJsonProvider = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(fsUtils_1.IFsUtils)),
    __param(1, inversify_1.inject(configuration_1.AnyLaunchConfiguration))
], PackageJsonProvider);
exports.PackageJsonProvider = PackageJsonProvider;
//# sourceMappingURL=packageJsonProvider.js.map
//# sourceMappingURL=packageJsonProvider.js.map
