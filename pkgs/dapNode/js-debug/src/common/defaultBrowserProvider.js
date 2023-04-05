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
exports.DefaultBrowserProvider = exports.IDefaultBrowserProvider = void 0;
const default_browser_1 = __importDefault(require("default-browser"));
const inversify_1 = require("inversify");
const ioc_extras_1 = require("../ioc-extras");
const processUtils_1 = require("./processUtils");
const objUtils_1 = require("./objUtils");
const substrings = new Map([
    ['chrome', 0 /* Chrome */],
    ['safari', 1 /* Safari */],
    ['firefox', 2 /* Firefox */],
    ['msedge', 3 /* Edge */],
    ['appxq0fevzme2pys62n3e0fbqa7peapykr8v', 4 /* OldEdge */],
    ['ie.http', 5 /* IE */],
]);
const getMatchingBrowserInString = (str) => {
    str = str.toLowerCase();
    for (const [needle, browser] of substrings.entries()) {
        if (str.includes(needle)) {
            return browser;
        }
    }
};
exports.IDefaultBrowserProvider = Symbol('IDefaultBrowserProvider');
let DefaultBrowserProvider = class DefaultBrowserProvider {
    constructor(execa, platform = process.platform) {
        this.execa = execa;
        this.platform = platform;
        /**
         * Cache the result of this function. This adds a few milliseconds
         * (subprocesses out on all platforms) and people rarely change their
         * default browser.
         * @inheritdoc
         */
        this.lookup = objUtils_1.once(() => {
            if (this.platform === 'win32') {
                return this.lookupWindows();
            }
            else {
                return this.lookupUnix();
            }
        });
    }
    async lookupUnix() {
        const { name } = await default_browser_1.default();
        return getMatchingBrowserInString(name);
    }
    async lookupWindows() {
        const result = await this.execa('reg', [
            'QUERY',
            ' HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice',
            '/v',
            'ProgId',
        ]);
        if (result.failed) {
            throw processUtils_1.ChildProcessError.fromExeca(result);
        }
        const match = /ProgId\s*REG_SZ\s*(\S+)/.exec(result.stdout);
        if (!match) {
            return undefined;
        }
        return getMatchingBrowserInString(match[1]);
    }
};
DefaultBrowserProvider = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.Execa))
], DefaultBrowserProvider);
exports.DefaultBrowserProvider = DefaultBrowserProvider;
//# sourceMappingURL=defaultBrowserProvider.js.map
//# sourceMappingURL=defaultBrowserProvider.js.map
