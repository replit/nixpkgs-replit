"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const messageFormat_1 = require("../../adapter/messageFormat");
const objectPreview_1 = require("../../adapter/objectPreview");
function default_1(api) {
    api.bench('simple', () => {
        messageFormat_1.formatMessage('', [{ type: 'number', value: 1234, description: '1234', subtype: undefined }], objectPreview_1.messageFormatters);
    });
}
exports.default = default_1;
//# sourceMappingURL=formatMessage.js.map
//# sourceMappingURL=formatMessage.js.map
