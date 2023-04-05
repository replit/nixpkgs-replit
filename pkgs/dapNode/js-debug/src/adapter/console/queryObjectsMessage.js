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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryObjectsMessage = void 0;
const nls = __importStar(require("vscode-nls"));
const objectPreview_1 = require("../objectPreview");
const previewThis_1 = require("../templates/previewThis");
const localize = nls.loadMessageBundle();
/**
 * Message sent as the result of querying objects on the runtime.
 */
class QueryObjectsMessage {
    constructor(protoObj, cdp) {
        this.protoObj = protoObj;
        this.cdp = cdp;
    }
    async toDap(thread) {
        if (!this.protoObj.objectId) {
            return {
                category: 'stderr',
                output: localize('queryObject.invalidObject', 'Only objects can be queried'),
            };
        }
        const response = await this.cdp.Runtime.queryObjects({
            prototypeObjectId: this.protoObj.objectId,
            objectGroup: 'console',
        });
        await this.cdp.Runtime.releaseObject({ objectId: this.protoObj.objectId });
        if (!response) {
            return {
                category: 'stderr',
                output: localize('queryObject.couldNotQuery', 'Could not query the provided object'),
            };
        }
        let withPreview;
        try {
            withPreview = await previewThis_1.previewThis({
                cdp: this.cdp,
                args: [],
                objectId: response.objects.objectId,
                objectGroup: 'console',
                generatePreview: true,
            });
        }
        catch (e) {
            return {
                category: 'stderr',
                output: localize('queryObject.errorPreview', 'Could generate preview: {0}', e.message),
            };
        }
        const text = '\x1b[32mobjects: ' + objectPreview_1.previewRemoteObject(withPreview, 'repl') + '\x1b[0m';
        const variablesReference = (await thread.replVariables.createVariableForOutput(text, [withPreview])) || 0;
        return {
            category: 'stdout',
            output: '',
            variablesReference,
        };
    }
}
exports.QueryObjectsMessage = QueryObjectsMessage;
//# sourceMappingURL=queryObjectsMessage.js.map
//# sourceMappingURL=queryObjectsMessage.js.map
