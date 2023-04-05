"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.GzipPipeTransport = void 0;
const zlib_1 = require("zlib");
const rawPipeTransport_1 = require("./rawPipeTransport");
class GzipPipeTransport extends rawPipeTransport_1.RawPipeTransport {
    constructor(logger, write, pipeRead) {
        super(logger, zlib_1.createGzip(), (pipeRead || write).pipe(zlib_1.createGunzip()));
        this.pipeWrite.pipe(write);
    }
    /**
     * @override
     */
    send(message) {
        super.send(message);
        this.pipeWrite.flush(zlib_1.constants.Z_SYNC_FLUSH);
    }
    /**
     * @override
     */
    beforeClose() {
        this.pipeWrite.flush(zlib_1.constants.Z_FINISH);
    }
}
exports.GzipPipeTransport = GzipPipeTransport;
//# sourceMappingURL=gzipPipeTransport.js.map
//# sourceMappingURL=gzipPipeTransport.js.map
