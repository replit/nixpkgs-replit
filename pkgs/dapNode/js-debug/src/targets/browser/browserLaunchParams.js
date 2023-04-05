"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseURL = void 0;
const url_1 = require("url");
function baseURL(params) {
    if (params.url) {
        try {
            const baseUrl = new url_1.URL(params.url);
            baseUrl.pathname = '/';
            baseUrl.search = '';
            baseUrl.hash = '';
            if (baseUrl.protocol === 'data:')
                return undefined;
            return baseUrl.href;
        }
        catch (e) { }
    }
}
exports.baseURL = baseURL;
//# sourceMappingURL=browserLaunchParams.js.map
//# sourceMappingURL=browserLaunchParams.js.map
