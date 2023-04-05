"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
const chromehash_1 = require("@c4312/chromehash");
const fsUtils_1 = require("../fsUtils");
/**
 * Script loaded though _sometimes_ include the Node.js module wrapper code.
 * Sometimes they don't. If we're in Node, for content hashing try both
 * the wrapped an unwrapped version of the file if necessary.
 *
 * @see https://nodejs.org/api/modules.html#modules_the_module_wrapper
 */
const nodePrefix = Buffer.from('(function (exports, require, module, __filename, __dirname) { ');
const nodeSuffix = Buffer.from('\n});');
/**
 * Script loaded through Electron have wrapped code similar to Node, but with
 * even more wrapping!
 *
 * @see https://github.com/electron/electron/blob/9c8cdd63fdba87f8505258b2ce81e1dfc30497fc/lib/renderer/init.ts#L5-L25
 */
const electronPrefix = Buffer.from('(function (exports, require, module, __filename, __dirname, process, global, Buffer) { ' +
    'return function (exports, require, module, __filename, __dirname) { ');
const electronSuffix = Buffer.from('\n}.call(this, exports, require, module, __filename, __dirname); });');
/**
 * Node scripts starting with a shebang also have that stripped out.
 */
const shebangPrefix = Buffer.from('#!');
const CR = Buffer.from('\r')[0];
const LF = Buffer.from('\n')[0];
const hasPrefix = (buf, prefix) => buf.slice(0, prefix.length).equals(prefix);
const verifyBytes = (bytes, expected, checkNode) => {
    if (chromehash_1.hash(bytes) === expected) {
        return true;
    }
    if (checkNode) {
        if (hasPrefix(bytes, shebangPrefix)) {
            let end = bytes.indexOf(LF);
            if (bytes[end - 1] === CR) {
                // CRLF
                end--;
            }
            return chromehash_1.hash(bytes.slice(end)) === expected;
        }
        if (chromehash_1.hash(Buffer.concat([nodePrefix, bytes, nodeSuffix])) === expected) {
            return true;
        }
    }
    // todo -- doing a lot of concats, make chromehash able to hash an iterable of buffers?
    if (chromehash_1.hash(Buffer.concat([electronPrefix, bytes, electronSuffix])) === expected) {
        return true;
    }
    return false;
};
const toBuffer = (input) => input instanceof Buffer ? input : Buffer.from(input, 'utf-8');
async function handle(message) {
    switch (message.type) {
        case 0 /* HashFile */:
            try {
                const data = await fsUtils_1.readFileRaw(message.file);
                return { id: message.id, hash: chromehash_1.hash(data) };
            }
            catch (e) {
                return { id: message.id };
            }
        case 1 /* HashBytes */:
            try {
                return { id: message.id, hash: chromehash_1.hash(toBuffer(message.data)) };
            }
            catch (e) {
                return { id: message.id };
            }
        case 2 /* VerifyFile */:
            try {
                const data = await fsUtils_1.readFileRaw(message.file);
                return { id: message.id, matches: verifyBytes(data, message.expected, message.checkNode) };
            }
            catch (e) {
                return { id: message.id, matches: false };
            }
        case 3 /* VerifyBytes */:
            try {
                return {
                    id: message.id,
                    matches: verifyBytes(toBuffer(message.data), message.expected, message.checkNode),
                };
            }
            catch (e) {
                return { id: message.id, matches: false };
            }
    }
}
function startWorker(send) {
    process.on('message', (msg) => {
        handle(msg).then(send);
    });
}
if (process.send) {
    startWorker(process.send.bind(process));
}
//# sourceMappingURL=hash.js.map
//# sourceMappingURL=hash.js.map
