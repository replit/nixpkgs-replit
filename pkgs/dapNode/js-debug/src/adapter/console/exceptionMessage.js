"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExceptionMessage = void 0;
const objUtils_1 = require("../../common/objUtils");
const objectPreview_1 = require("../objectPreview");
const stackTrace_1 = require("../stackTrace");
const textualMessage_1 = require("./textualMessage");
/**
 * Special console message formed from an unhandled exception.
 */
class ExceptionMessage extends textualMessage_1.TextualMessage {
    constructor() {
        super(...arguments);
        /**
         * @override
         */
        this.stackTrace = objUtils_1.once((thread) => {
            if (this.event.stackTrace) {
                return stackTrace_1.StackTrace.fromRuntime(thread, this.event.stackTrace);
            }
            if (this.event.scriptId) {
                // script parsed errors will not have a stacktrace
                return stackTrace_1.StackTrace.fromRuntime(thread, {
                    callFrames: [
                        {
                            functionName: '(program)',
                            lineNumber: this.event.lineNumber,
                            columnNumber: this.event.columnNumber,
                            scriptId: this.event.scriptId,
                            url: this.event.url || '',
                        },
                    ],
                });
            }
            return undefined;
        });
    }
    /**
     * @override
     */
    async toDap(thread) {
        const preview = this.event.exception ? objectPreview_1.previewException(this.event.exception) : { title: '' };
        let message = preview.title;
        if (!message.startsWith('Uncaught')) {
            message = 'Uncaught ' + message;
        }
        const stackTrace = this.stackTrace(thread);
        const args = this.event.exception && !preview.stackTrace ? [this.event.exception] : [];
        return Object.assign({ category: 'stderr', output: message, variablesReference: stackTrace || args.length
                ? await thread.replVariables.createVariableForOutput(message, args, stackTrace)
                : undefined }, (await this.getUiLocation(thread)));
    }
}
exports.ExceptionMessage = ExceptionMessage;
//# sourceMappingURL=exceptionMessage.js.map
//# sourceMappingURL=exceptionMessage.js.map
