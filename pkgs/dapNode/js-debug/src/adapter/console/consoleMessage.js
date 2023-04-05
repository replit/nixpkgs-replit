"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndGroupMessage = exports.ClearMessage = void 0;
class ClearMessage {
    /**
     * @inheritdoc
     */
    toDap() {
        return {
            category: 'console',
            output: '\x1b[2J',
        };
    }
}
exports.ClearMessage = ClearMessage;
class EndGroupMessage {
    /**
     * @inheritdoc
     */
    toDap() {
        return { category: 'stdout', output: '', group: 'end' };
    }
}
exports.EndGroupMessage = EndGroupMessage;
//# sourceMappingURL=consoleMessage.js.map
//# sourceMappingURL=consoleMessage.js.map
