"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.signalReadyExpr = void 0;
const templates_1 = require("../../adapter/templates");
/**
 * Expression to be evaluated to set that the debugger is successfully attached
 * and ready for extensions to start being debugged.
 *
 * See microsoft/vscode#106698.
 */
exports.signalReadyExpr = () => `globalThis.__jsDebugIsReady = true; ` + templates_1.getSourceSuffix();
//# sourceMappingURL=extensionHostExtras.js.map
//# sourceMappingURL=extensionHostExtras.js.map
