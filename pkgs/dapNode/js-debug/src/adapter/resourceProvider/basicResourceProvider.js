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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasicResourceProvider = void 0;
const data_uri_to_buffer_1 = __importDefault(require("data-uri-to-buffer"));
const got_1 = __importStar(require("got"));
const inversify_1 = require("inversify");
const _1 = require(".");
const cancellation_1 = require("../../common/cancellation");
const disposable_1 = require("../../common/disposable");
const urlUtils_1 = require("../../common/urlUtils");
const ioc_extras_1 = require("../../ioc-extras");
const requestOptionsProvider_1 = require("./requestOptionsProvider");
let BasicResourceProvider = class BasicResourceProvider {
    constructor(fs, options) {
        this.fs = fs;
        this.options = options;
    }
    /**
     * @inheritdoc
     */
    async fetch(url, cancellationToken = cancellation_1.NeverCancelled, headers) {
        try {
            const r = data_uri_to_buffer_1.default(url);
            return { ok: true, body: r.toString('utf-8'), statusCode: 200 };
        }
        catch (_a) {
            // assume it's a remote url
        }
        const absolutePath = urlUtils_1.isAbsolute(url) ? url : urlUtils_1.fileUrlToAbsolutePath(url);
        if (absolutePath) {
            try {
                return { ok: true, body: await this.fs.readFile(absolutePath, 'utf-8'), statusCode: 200 };
            }
            catch (error) {
                return { ok: false, error, statusCode: 200 };
            }
        }
        return this.fetchHttp(url, cancellationToken, headers);
    }
    /**
     * Returns JSON from the given file, data, or HTTP URL.
     */
    async fetchJson(url, cancellationToken, headers) {
        const res = await this.fetch(url, cancellationToken, Object.assign({ Accept: 'application/json' }, headers));
        if (!res.ok) {
            return res;
        }
        try {
            return Object.assign(Object.assign({}, res), { body: JSON.parse(res.body) });
        }
        catch (error) {
            return Object.assign(Object.assign({}, res), { ok: false, error });
        }
    }
    async fetchHttp(url, cancellationToken, headers) {
        var _a, _b, _c, _d;
        const isSecure = !url.startsWith('http://');
        const options = { headers, followRedirect: true };
        if (isSecure && (await urlUtils_1.isLoopback(url))) {
            options.rejectUnauthorized = false;
        }
        (_a = this.options) === null || _a === void 0 ? void 0 : _a.provideOptions(options, url);
        const disposables = new disposable_1.DisposableList();
        try {
            const request = got_1.default(url, options);
            disposables.push(cancellationToken.onCancellationRequested(() => request.cancel()));
            const response = await request;
            return { ok: true, body: response.body, statusCode: response.statusCode };
        }
        catch (error) {
            if (!(error instanceof got_1.RequestError)) {
                throw error;
            }
            const body = error.response ? String((_b = error.response) === null || _b === void 0 ? void 0 : _b.body) : error.message;
            const statusCode = (_d = (_c = error.response) === null || _c === void 0 ? void 0 : _c.statusCode) !== null && _d !== void 0 ? _d : 503;
            return {
                ok: false,
                body,
                statusCode,
                error: new _1.HttpStatusError(statusCode, url, body),
            };
        }
    }
};
BasicResourceProvider = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(ioc_extras_1.FS)),
    __param(1, inversify_1.optional()), __param(1, inversify_1.inject(requestOptionsProvider_1.IRequestOptionsProvider))
], BasicResourceProvider);
exports.BasicResourceProvider = BasicResourceProvider;
//# sourceMappingURL=basicResourceProvider.js.map
//# sourceMappingURL=basicResourceProvider.js.map
