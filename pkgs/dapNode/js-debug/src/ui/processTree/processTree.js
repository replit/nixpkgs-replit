"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyseArguments = exports.processTree = void 0;
const windowsProcessTree_1 = require("./windowsProcessTree");
const darwinProcessTree_1 = require("./darwinProcessTree");
const posixProcessTree_1 = require("./posixProcessTree");
const fsUtils_1 = require("../../common/fsUtils");
const fs_1 = require("fs");
/**
 * The process tree implementation for the current platform.
 */
// TODO: Figure out how to inject the fsUtils here
const fsUtils = new fsUtils_1.LocalFsUtils(fs_1.promises);
exports.processTree = process.platform === 'win32'
    ? new windowsProcessTree_1.WindowsProcessTree()
    : process.platform === 'darwin'
        ? new darwinProcessTree_1.DarwinProcessTree(fsUtils)
        : new posixProcessTree_1.PosixProcessTree(fsUtils);
/*
 * Analyse the given command line arguments and extract debug port and protocol from it.
 */
function analyseArguments(args) {
    const DEBUG_FLAGS_PATTERN = /--inspect(-brk)?(=((\[[0-9a-fA-F:]*\]|[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+|[a-zA-Z0-9\.]*):)?(\d+))?/;
    const DEBUG_PORT_PATTERN = /--inspect-port=(\d+)/;
    let address;
    let port;
    // match --inspect, --inspect=1234, --inspect-brk, --inspect-brk=1234
    let matches = DEBUG_FLAGS_PATTERN.exec(args);
    if (matches && matches.length >= 1) {
        if (matches.length >= 5 && matches[4]) {
            address = matches[4];
        }
        if (matches.length >= 6 && matches[5]) {
            port = parseInt(matches[5]);
        }
    }
    // a --inspect-port=1234 overrides the port
    matches = DEBUG_PORT_PATTERN.exec(args);
    if (matches && matches.length === 2) {
        port = parseInt(matches[1]);
    }
    return { address, port };
}
exports.analyseArguments = analyseArguments;
//# sourceMappingURL=processTree.js.map
//# sourceMappingURL=processTree.js.map
