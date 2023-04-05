"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const debugServer_1 = require("./debugServer");
let port = 0;
let host;
if (process.argv.length >= 3) {
    // Interpret the argument as either a port number, or 'address:port'.
    const address = process.argv[2];
    const colonIndex = address.lastIndexOf(':');
    if (colonIndex === -1) {
        port = +address;
    }
    else {
        host = address.substring(0, colonIndex);
        port = +address.substring(colonIndex + 1);
    }
}
debugServer_1.startDebugServer(port, host);
//# sourceMappingURL=debugServerMain.js.map
//# sourceMappingURL=debugServerMain.js.map
