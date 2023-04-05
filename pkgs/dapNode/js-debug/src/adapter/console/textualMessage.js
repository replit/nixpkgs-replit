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
exports.TableMessage = exports.StartGroupMessage = exports.ErrorMessage = exports.WarningMessage = exports.TraceMessage = exports.LogMessage = exports.AssertMessage = exports.TextualMessage = void 0;
const nls = __importStar(require("vscode-nls"));
const objUtils_1 = require("../../common/objUtils");
const messageFormat_1 = require("../messageFormat");
const objectPreview_1 = require("../objectPreview");
const stackTrace_1 = require("../stackTrace");
const localize = nls.loadMessageBundle();
class TextualMessage {
    constructor(event) {
        this.event = event;
        this.stackTrace = objUtils_1.once((thread) => this.event.stackTrace ? stackTrace_1.StackTrace.fromRuntime(thread, this.event.stackTrace) : undefined);
        /**
         * Gets the UI location where the message was logged.
         */
        this.getUiLocation = objUtils_1.once(async (thread) => {
            const stackTrace = this.stackTrace(thread);
            if (!stackTrace) {
                return;
            }
            let firstExistingLocation;
            for (let i = 0; i < stackTrace.frames.length; i++) {
                const uiLocation = await stackTrace.frames[i].uiLocation();
                if (!uiLocation) {
                    continue;
                }
                if (!firstExistingLocation) {
                    firstExistingLocation = uiLocation;
                }
                if (uiLocation.source.blackboxed()) {
                    continue;
                }
                return {
                    source: await uiLocation.source.toDap(),
                    line: uiLocation.lineNumber,
                    column: uiLocation.columnNumber,
                };
            }
            // if all the stack is blackboxed, fall back to the original location
            if (firstExistingLocation) {
                return {
                    source: await firstExistingLocation.source.toDap(),
                    line: firstExistingLocation.lineNumber,
                    column: firstExistingLocation.columnNumber,
                };
            }
        });
    }
    /**
     * Default message string formatter. Tries to create a simple string, and
     * but if it can't it'll return a variable reference.
     *
     * Intentionally not async-await as it's a hot path in console logging.
     */
    formatDefaultString(thread, args, includeStackInVariables = false) {
        const useMessageFormat = args.length > 1 && args[0].type === 'string';
        const formatResult = useMessageFormat
            ? messageFormat_1.formatMessage(args[0].value, args.slice(1), objectPreview_1.messageFormatters)
            : messageFormat_1.formatMessage('', args, objectPreview_1.messageFormatters);
        const output = formatResult.result + '\n';
        if (formatResult.usedAllSubs && !args.some(objectPreview_1.previewAsObject)) {
            return { output };
        }
        else {
            return this.formatComplexStringOutput(thread, output, args, includeStackInVariables);
        }
    }
    async formatComplexStringOutput(thread, output, args, includeStackInVariables) {
        if (args.some(a => a.subtype === 'error')) {
            await this.getUiLocation(thread); // ensure the source is loaded before decoding stack
            output = await thread.replacePathsInStackTrace(output);
        }
        const variablesReference = await thread.replVariables.createVariableForOutput(output, args, includeStackInVariables ? this.stackTrace(thread) : undefined);
        return { output: '', variablesReference };
    }
}
exports.TextualMessage = TextualMessage;
class AssertMessage extends TextualMessage {
    /**
     * @override
     */
    async toDap(thread) {
        var _a;
        if (((_a = this.event.args[0]) === null || _a === void 0 ? void 0 : _a.value) === 'console.assert') {
            this.event.args[0].value = localize('console.assert', 'Assertion failed');
        }
        return Object.assign(Object.assign({ category: 'stderr' }, (await this.formatDefaultString(thread, this.event.args, /* includeStack= */ true))), (await this.getUiLocation(thread)));
    }
}
exports.AssertMessage = AssertMessage;
class DefaultMessage extends TextualMessage {
    constructor(event, includeStack, category) {
        super(event);
        this.includeStack = includeStack;
        this.category = category;
    }
    /**
     * @override
     */
    async toDap(thread) {
        return Object.assign(Object.assign({ category: this.category }, (await this.formatDefaultString(thread, this.event.args, this.includeStack))), (await this.getUiLocation(thread)));
    }
}
class LogMessage extends DefaultMessage {
    constructor(event) {
        super(event, false, 'stdout');
    }
}
exports.LogMessage = LogMessage;
class TraceMessage extends DefaultMessage {
    constructor(event) {
        super(event, true, 'stdout');
    }
}
exports.TraceMessage = TraceMessage;
class WarningMessage extends DefaultMessage {
    constructor(event) {
        super(event, true, 'stderr');
    }
}
exports.WarningMessage = WarningMessage;
class ErrorMessage extends DefaultMessage {
    constructor(event) {
        super(event, true, 'stderr');
    }
}
exports.ErrorMessage = ErrorMessage;
class StartGroupMessage extends TextualMessage {
    /**
     * @override
     */
    async toDap(thread) {
        return Object.assign(Object.assign({ category: 'stdout', group: this.event.type === 'startGroupCollapsed' ? 'startCollapsed' : 'start' }, (await this.formatDefaultString(thread, this.event.args))), (await this.getUiLocation(thread)));
    }
}
exports.StartGroupMessage = StartGroupMessage;
class TableMessage extends DefaultMessage {
    constructor(event) {
        super(event, false, 'stdout');
    }
    /**
     * @override
     */
    async toDap(thread) {
        var _a;
        if ((_a = this.event.args[0]) === null || _a === void 0 ? void 0 : _a.preview) {
            return Object.assign({ category: 'stdout', output: '', variablesReference: await thread.replVariables.createVariableForOutput(objectPreview_1.formatAsTable(this.event.args[0].preview) + '\n', this.event.args) }, (await this.getUiLocation(thread)));
        }
        return super.toDap(thread);
    }
}
exports.TableMessage = TableMessage;
//# sourceMappingURL=textualMessage.js.map
//# sourceMappingURL=textualMessage.js.map
