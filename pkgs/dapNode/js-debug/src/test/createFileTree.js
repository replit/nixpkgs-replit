"use strict";
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
exports.createFileTree = exports.getTestDir = void 0;
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
const fs = __importStar(require("fs"));
const os_1 = require("os");
const path = __importStar(require("path"));
const path_1 = require("path");
const crypto_1 = require("crypto");
exports.getTestDir = () => path_1.join(os_1.tmpdir(), 'js-debug-test-' + crypto_1.randomBytes(6).toString('hex'));
/**
 * Creates a file tree at the given location. Primarily useful for creating
 * fixtures in unit tests.
 */
function createFileTree(rootDir, tree) {
    fs.mkdirSync(rootDir, { recursive: true });
    for (const key of Object.keys(tree)) {
        const value = tree[key];
        const targetPath = path.join(rootDir, key);
        let write;
        if (typeof value === 'string') {
            write = Buffer.from(value);
        }
        else if (value instanceof Buffer) {
            write = value;
        }
        else if (value instanceof Array) {
            write = Buffer.from(value.join(os_1.EOL));
        }
        else {
            createFileTree(targetPath, value);
            continue;
        }
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, write);
    }
}
exports.createFileTree = createFileTree;
//# sourceMappingURL=createFileTree.js.map
//# sourceMappingURL=createFileTree.js.map
