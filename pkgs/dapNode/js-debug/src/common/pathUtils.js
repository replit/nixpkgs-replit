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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWindowsPath = exports.isUncPath = exports.isSubdirectoryOf = exports.splitWithDriveLetter = exports.forceForwardSlashes = exports.fixDriveLetterAndSlashes = exports.fixDriveLetter = exports.properRelative = exports.properResolve = exports.properJoin = exports.isWithinAsar = exports.findExecutable = exports.findInPath = void 0;
const execa_1 = __importDefault(require("execa"));
const path = __importStar(require("path"));
const fsUtils_1 = require("./fsUtils");
const objUtils_1 = require("./objUtils");
/*
 * Lookup the given program on the PATH and return its absolute path on success and undefined otherwise.
 */
async function findInPath(fs, program, env) {
    let locator;
    if (process.platform === 'win32') {
        const windir = env['WINDIR'] || 'C:\\Windows';
        locator = path.join(windir, 'System32', 'where.exe');
    }
    else {
        locator = '/usr/bin/which';
    }
    try {
        if (await fsUtils_1.existsInjected(fs, locator)) {
            const located = await execa_1.default(locator, [program], { env: objUtils_1.removeNulls(env) });
            const lines = located.stdout.split(/\r?\n/);
            if (process.platform === 'win32') {
                // return the first path that has a executable extension
                const executableExtensions = String(env['PATHEXT'] || '.exe')
                    .toUpperCase()
                    .split(';');
                for (const candidate of lines) {
                    const ext = path.extname(candidate).toUpperCase();
                    if (ext && executableExtensions.includes(ext)) {
                        return candidate;
                    }
                }
            }
            else {
                // return the first path
                if (lines.length > 0) {
                    return lines[0];
                }
            }
            return undefined;
        }
        else {
            // do not report failure if 'locator' app doesn't exist
        }
        return program;
    }
    catch (err) {
        // fall through
    }
    // fail
    return undefined;
}
exports.findInPath = findInPath;
/*
 * Ensures the program exists, adding its executable as necessary on Windows.
 */
async function findExecutable(fs, program, env) {
    if (!program) {
        return undefined;
    }
    if (process.platform === 'win32' && !path.extname(program)) {
        const pathExtension = env.lookup('PATHEXT');
        if (pathExtension) {
            const executableExtensions = pathExtension.split(';');
            for (const extension of executableExtensions) {
                const path = program + extension;
                if (await fsUtils_1.existsInjected(fs, path)) {
                    return path;
                }
            }
        }
    }
    if (await fsUtils_1.existsInjected(fs, program)) {
        return program;
    }
    return undefined;
}
exports.findExecutable = findExecutable;
/**
 * Electron shims us to be able to files from `.asar` files, but
 * these don't actually exist on the filesystem and will
 * cause failures if we think they are.
 */
exports.isWithinAsar = (filePath) => filePath.includes(`.asar${path.sep}`);
/**
 * Join path segments properly based on whether they appear to be c:/ -style or / style.
 * Note - must check posix first because win32.isAbsolute includes posix.isAbsolute
 */
function properJoin(...segments) {
    if (path.posix.isAbsolute(segments[0])) {
        return forceForwardSlashes(path.posix.join(...segments));
    }
    else if (path.win32.isAbsolute(segments[0])) {
        return path.win32.join(...segments);
    }
    else {
        return path.join(...segments);
    }
}
exports.properJoin = properJoin;
/**
 * Resolves path segments properly based on whether they appear to be c:/ -style or / style.
 */
function properResolve(...segments) {
    if (path.posix.isAbsolute(segments[0])) {
        return path.posix.resolve(...segments);
    }
    else if (path.win32.isAbsolute(segments[0])) {
        return path.win32.resolve(...segments);
    }
    else {
        return path.resolve(...segments);
    }
}
exports.properResolve = properResolve;
/**
 * Resolves path segments properly based on whether they appear to be c:/ -style or / style.
 */
function properRelative(fromPath, toPath) {
    if (path.posix.isAbsolute(fromPath)) {
        return path.posix.relative(fromPath, toPath);
    }
    else if (path.win32.isAbsolute(fromPath)) {
        return path.win32.relative(fromPath, toPath);
    }
    else {
        return path.relative(fromPath, toPath);
    }
}
exports.properRelative = properRelative;
function fixDriveLetter(aPath, uppercaseDriveLetter = false) {
    if (!aPath)
        return aPath;
    if (aPath.match(/file:\/\/\/[A-Za-z]:/)) {
        const prefixLen = 'file:///'.length;
        aPath = 'file:///' + aPath[prefixLen].toLowerCase() + aPath.substr(prefixLen + 1);
    }
    else if (exports.isWindowsPath(aPath)) {
        // If the path starts with a drive letter, ensure lowercase. VS Code uses a lowercase drive letter
        const driveLetter = uppercaseDriveLetter ? aPath[0].toUpperCase() : aPath[0].toLowerCase();
        aPath = driveLetter + aPath.substr(1);
    }
    return aPath;
}
exports.fixDriveLetter = fixDriveLetter;
/**
 * Ensure lower case drive letter and \ on Windows
 */
function fixDriveLetterAndSlashes(aPath, uppercaseDriveLetter = false) {
    if (!aPath)
        return aPath;
    aPath = fixDriveLetter(aPath, uppercaseDriveLetter);
    if (aPath.match(/file:\/\/\/[A-Za-z]:/)) {
        const prefixLen = 'file:///'.length;
        aPath = aPath.substr(0, prefixLen + 1) + aPath.substr(prefixLen + 1).replace(/\//g, '\\');
    }
    else if (exports.isWindowsPath(aPath)) {
        aPath = aPath.replace(/\//g, '\\');
    }
    return aPath;
}
exports.fixDriveLetterAndSlashes = fixDriveLetterAndSlashes;
/**
 * Replace any backslashes with forward slashes
 * blah\something => blah/something
 */
function forceForwardSlashes(aUrl) {
    return aUrl
        .replace(/\\\//g, '/') // Replace \/ (unnecessarily escaped forward slash)
        .replace(/\\/g, '/');
}
exports.forceForwardSlashes = forceForwardSlashes;
/**
 * Splits the path with the drive letter included with a trailing slash
 * such that path.join, readdir, etc. work on it standalone.
 */
exports.splitWithDriveLetter = (inputPath) => {
    const parts = inputPath.split(path.sep);
    if (/^[a-z]:$/i.test(parts[0])) {
        parts[0] += path.sep;
    }
    return parts;
};
/**
 * Gets whether the child is a subdirectory of its parent.
 */
exports.isSubdirectoryOf = (parent, child) => {
    const rel = path.relative(parent, child);
    return rel.length && !path.isAbsolute(rel) && !rel.startsWith('..');
};
/**
 * Returns whether the path looks like a UNC path.
 */
exports.isUncPath = (path) => path.startsWith('\\\\');
/**
 * Returns whether the path looks like a Windows path.
 */
exports.isWindowsPath = (path) => /^[A-Za-z]:/.test(path);
//# sourceMappingURL=pathUtils.js.map
//# sourceMappingURL=pathUtils.js.map
