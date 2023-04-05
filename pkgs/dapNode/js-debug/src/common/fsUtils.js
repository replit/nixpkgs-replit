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
exports.LocalAndRemoteFsUtils = exports.RemoteFsThroughDapUtils = exports.LocalFsUtils = exports.IFsUtils = exports.readFileRaw = exports.writeFile = exports.readfile = exports.readdir = exports.stat = exports.moveFile = exports.existsWithoutDeref = exports.existsInjected = exports.canAccess = exports.fsModule = void 0;
const fs = __importStar(require("fs"));
const util = __importStar(require("util"));
exports.fsModule = fs;
/**
 * Returns whether the user can access the given file path.
 */
async function canAccess({ access }, file) {
    if (!file) {
        return false;
    }
    try {
        await access(file);
        return true;
    }
    catch (e) {
        return false;
    }
}
exports.canAccess = canAccess;
/**
 * Returns whether the user can access the given file path.
 */
async function existsInjected({ stat }, file) {
    if (!file) {
        return;
    }
    try {
        return await stat(file);
    }
    catch (e) {
        return;
    }
}
exports.existsInjected = existsInjected;
/**
 * Returns the file path exists without derefencing symblinks.
 */
async function existsWithoutDeref({ lstat }, file) {
    if (!file) {
        return;
    }
    try {
        return await lstat(file);
    }
    catch (e) {
        return;
    }
}
exports.existsWithoutDeref = existsWithoutDeref;
/**
 * Moves the file from the source to destination.
 */
async function moveFile({ copyFile, rename, unlink }, src, dest) {
    try {
        await rename(src, dest);
    }
    catch (_a) {
        await copyFile(src, dest);
        await unlink(src);
    }
}
exports.moveFile = moveFile;
function stat(path) {
    return new Promise(cb => {
        fs.stat(path, (err, stat) => {
            return cb(err ? undefined : stat);
        });
    });
}
exports.stat = stat;
function readdir(path) {
    return new Promise(cb => {
        fs.readdir(path, 'utf8', async (err, entries) => {
            cb(err ? [] : entries);
        });
    });
}
exports.readdir = readdir;
function readfile(path) {
    return new Promise(cb => {
        fs.readFile(path, 'utf8', async (err, content) => {
            cb(err ? '' : content);
        });
    });
}
exports.readfile = readfile;
exports.writeFile = util.promisify(fs.writeFile);
function readFileRaw(path) {
    return fs.promises.readFile(path).catch(() => Buffer.alloc(0));
}
exports.readFileRaw = readFileRaw;
/**
 * Injection for the `IFsUtils` interface.
 */
exports.IFsUtils = Symbol('FsUtils');
class LocalFsUtils {
    constructor(fs) {
        this.fs = fs;
    }
    realPath(path) {
        return this.fs.realpath(path);
    }
    async exists(path) {
        // Check if the file exists in the current directory.
        try {
            await this.fs.access(path, fs.constants.F_OK);
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    readFile(path) {
        return this.fs.readFile(path);
    }
}
exports.LocalFsUtils = LocalFsUtils;
class RemoteFsThroughDapUtils {
    constructor(dap) {
        this.dap = dap;
    }
    async realPath() {
        throw new Error('not implemented');
    }
    async exists(path) {
        try {
            const { doesExists } = await this.dap.remoteFileExistsRequest({
                localFilePath: path,
            });
            return doesExists;
        }
        catch (_a) {
            return false;
        }
    }
    readFile() {
        throw new Error('not implemented');
    }
}
exports.RemoteFsThroughDapUtils = RemoteFsThroughDapUtils;
/**
 * Notes: remoteFilePrefix = '' // will do all fs operations thorugh DAP requests
 * remoteFilePrefix = undefined // will do all operations thorugh Local Node.fs
 */
class LocalAndRemoteFsUtils {
    constructor(remoteFilePrefix, localFsUtils, remoteFsUtils) {
        this.remoteFilePrefix = remoteFilePrefix;
        this.localFsUtils = localFsUtils;
        this.remoteFsUtils = remoteFsUtils;
    }
    static create(remoteFilePrefix, fsPromises, dap) {
        const localFsUtils = new LocalFsUtils(fsPromises);
        if (remoteFilePrefix !== undefined) {
            return new this(remoteFilePrefix.toLowerCase(), localFsUtils, new RemoteFsThroughDapUtils(dap));
        }
        else {
            return localFsUtils;
        }
    }
    async exists(path) {
        return this.selectFs(path).exists(path);
    }
    async readFile(path) {
        return this.selectFs(path).readFile(path);
    }
    async realPath(path) {
        return this.selectFs(path).realPath(path);
    }
    selectFs(path) {
        return path.toLowerCase().startsWith(this.remoteFilePrefix)
            ? this.remoteFsUtils
            : this.localFsUtils;
    }
}
exports.LocalAndRemoteFsUtils = LocalAndRemoteFsUtils;
//# sourceMappingURL=fsUtils.js.map
//# sourceMappingURL=fsUtils.js.map
