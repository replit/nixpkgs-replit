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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NvmResolver = exports.INvmResolver = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const errors_1 = require("../../dap/errors");
const protocolError_1 = require("../../dap/protocolError");
const inversify_1 = require("inversify");
const promiseUtil_1 = require("../../common/promiseUtil");
const fsUtils_1 = require("../../common/fsUtils");
const fs_1 = require("fs");
const fsUtils_2 = require("../../common/fsUtils");
exports.INvmResolver = Symbol('INvmResolver');
let NvmResolver = class NvmResolver {
    constructor(fsUtils = new fsUtils_1.LocalFsUtils(fs_1.promises), env = process.env, arch = process.arch, platform = process.platform) {
        this.fsUtils = fsUtils;
        this.env = env;
        this.arch = arch;
        this.platform = platform;
    }
    async resolveNvmVersionPath(version) {
        let nvsHome = this.env["NVS_HOME" /* NvsHome */];
        if (!nvsHome) {
            // NVS_HOME is not always set. Probe for 'nvs' directory instead
            const nvsDir = this.platform === 'win32'
                ? path.join(this.env['LOCALAPPDATA'] || '', 'nvs')
                : path.join(this.env['HOME'] || '', '.nvs');
            if (fs.existsSync(nvsDir)) {
                nvsHome = nvsDir;
            }
        }
        let directory = undefined;
        const versionManagers = [];
        const versionData = this.parseVersionString(version);
        if (versionData.nvsFormat || nvsHome) {
            directory = await this.resolveNvs(nvsHome, versionData);
            if (!directory && versionData.nvsFormat) {
                throw new protocolError_1.ProtocolError(errors_1.nvmVersionNotFound(version, 'nvs'));
            }
            versionManagers.push('nvs');
        }
        if (!directory) {
            if (this.platform === 'win32') {
                if (this.env["NVM_HOME" /* WindowsNvmHome */]) {
                    directory = await this.resolveWindowsNvm(version);
                    versionManagers.push('nvm-windows');
                }
            }
            else if (this.env["NVM_DIR" /* UnixNvmHome */]) {
                directory = await this.resolveUnixNvm(version);
                versionManagers.push('nvm');
            }
        }
        if (!versionManagers.length) {
            throw new protocolError_1.ProtocolError(errors_1.nvmNotFound());
        }
        if (!directory || !(await this.fsUtils.exists(directory))) {
            throw new protocolError_1.ProtocolError(errors_1.nvmVersionNotFound(version, versionManagers.join('/')));
        }
        return { directory, binary: await this.getBinaryInFolder(directory) };
    }
    /**
     * Returns the Node binary in the given folder. In recent versions of x64
     * nvm on windows, nvm installs the exe as "node64" rather than "node".
     * This detects that.
     */
    async getBinaryInFolder(dir) {
        if (await promiseUtil_1.some(['node64.exe', 'node64'].map(exe => this.fsUtils.exists(path.join(dir, exe))))) {
            return 'node64';
        }
        return 'node';
    }
    async resolveNvs(nvsHome, { remoteName, semanticVersion, arch }) {
        if (!nvsHome) {
            throw new protocolError_1.ProtocolError(errors_1.nvsNotFound());
        }
        const dir = this.findBinFolderForVersion(path.join(nvsHome, remoteName), semanticVersion, d => fs.existsSync(path.join(d, arch)));
        if (!dir) {
            return undefined;
        }
        return this.platform !== 'win32' ? path.join(dir, arch, 'bin') : path.join(dir, arch);
    }
    async resolveUnixNvm(version) {
        // macOS and linux
        let nvmHome = this.env["NVM_DIR" /* UnixNvmHome */];
        if (!nvmHome) {
            // if NVM_DIR is not set. Probe for '.nvm' directory instead
            const nvmDir = path.join(this.env['HOME'] || '', '.nvm');
            if (await this.fsUtils.exists(nvmDir)) {
                nvmHome = nvmDir;
            }
        }
        if (!nvmHome) {
            throw new protocolError_1.ProtocolError(errors_1.nvmNotFound());
        }
        const directory = this.findBinFolderForVersion(path.join(nvmHome, 'versions', 'node'), `v${version}`);
        return directory ? path.join(directory, 'bin') : undefined;
    }
    async resolveWindowsNvm(version) {
        const nvmHome = this.env["NVM_HOME" /* WindowsNvmHome */];
        if (!nvmHome) {
            throw new protocolError_1.ProtocolError(errors_1.nvmHomeNotFound());
        }
        return this.findBinFolderForVersion(nvmHome, `v${version}`);
    }
    findBinFolderForVersion(dir, version, extraTest) {
        if (!fs.existsSync(dir)) {
            return undefined;
        }
        const available = fs.readdirSync(dir);
        if (available.includes(version)) {
            return path.join(dir, version);
        }
        const best = available
            .filter(p => p.startsWith(`${version}.`))
            .sort(semverSortAscending)
            .filter(p => (extraTest ? extraTest(path.join(dir, p)) : true))
            .pop();
        return best ? path.join(dir, best) : undefined;
    }
    /**
     * Parses a node version string into remote name, semantic version, and architecture
     * components. Infers some unspecified components based on configuration.
     */
    parseVersionString(versionString) {
        // Pattern: (flavor?)/(v?)X.X.X/(arch?)
        const versionRegex = /^(([\w-]+)\/)?(v?(\d+(\.\d+(\.\d+)?)?))(\/((x86)|(32)|((x)?64)|(arm\w*)|(ppc\w*)))?$/i;
        const match = versionRegex.exec(versionString);
        if (!match) {
            throw new Error('Invalid version string: ' + versionString);
        }
        const nvsFormat = !!(match[2] || match[8]);
        const remoteName = match[2] || 'node';
        const semanticVersion = match[4] || '';
        const arch = nvsStandardArchName(match[8] || this.arch);
        return { nvsFormat, remoteName, semanticVersion, arch };
    }
};
NvmResolver = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(fsUtils_2.IFsUtils))
], NvmResolver);
exports.NvmResolver = NvmResolver;
const semverSortAscending = (a, b) => {
    const matchA = /([0-9]+)\.([0-9]+)\.([0-9]+)/.exec(a);
    const matchB = /([0-9]+)\.([0-9]+)\.([0-9]+)/.exec(b);
    if (!matchA || !matchB) {
        return (matchB ? -1 : 0) + (matchA ? 1 : 0);
    }
    const [, aMajor, aMinor, aPatch] = matchA;
    const [, bMajor, bMinor, bPatch] = matchB;
    return (Number(aMajor) - Number(bMajor) ||
        Number(aMinor) - Number(bMinor) ||
        Number(aPatch) - Number(bPatch));
};
function nvsStandardArchName(arch) {
    switch (arch) {
        case '32':
        case 'x86':
        case 'ia32':
            return 'x86';
        case '64':
        case 'x64':
        case 'amd64':
            return 'x64';
        case 'arm':
            // eslint-disable-next-line
            const armVersion = process.config.variables.arm_version;
            return armVersion ? 'armv' + armVersion + 'l' : 'arm';
        default:
            return arch;
    }
}
//# sourceMappingURL=nvmResolver.js.map
//# sourceMappingURL=nvmResolver.js.map
