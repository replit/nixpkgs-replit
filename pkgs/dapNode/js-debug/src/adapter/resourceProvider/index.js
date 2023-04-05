"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.IResourceProvider = exports.HttpStatusError = void 0;
/**
 * Error type thrown for a non-2xx status code.
 */
class HttpStatusError extends Error {
    constructor(statusCode, url, body) {
        super(`Unexpected ${statusCode} response from ${url}: ${body !== null && body !== void 0 ? body : '<empty body>'}`);
        this.statusCode = statusCode;
        this.url = url;
        this.body = body;
    }
}
exports.HttpStatusError = HttpStatusError;
exports.IResourceProvider = Symbol('IResourceProvider');
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
