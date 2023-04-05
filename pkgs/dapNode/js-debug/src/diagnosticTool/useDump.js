"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDump = exports.DumpContext = void 0;
const preact_1 = require("preact");
const hooks_1 = require("preact/hooks");
exports.DumpContext = preact_1.createContext(undefined);
exports.useDump = () => hooks_1.useContext(exports.DumpContext);
//# sourceMappingURL=useDump.js.map
//# sourceMappingURL=useDump.js.map
