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
exports.BlazorSourcePathResolver = void 0;
const path_1 = __importDefault(require("path"));
const utils = __importStar(require("../../common/urlUtils"));
const browserPathResolver_1 = require("./browserPathResolver");
class BlazorSourcePathResolver extends browserPathResolver_1.BrowserSourcePathResolver {
    constructor(vueMapper, fsUtils, options, logger) {
        super(vueMapper, fsUtils, options, logger);
        this.blazorInCodespacesRegexpSubstitution = '$1:\\$2';
        if (this.options.remoteFilePrefix) {
            const sep = `\\${path_1.default.sep}`;
            const escapedPrefix = this.options.remoteFilePrefix.replace(new RegExp(sep, 'g'), sep);
            this.blazorInCodespacesRegexp = new RegExp(`^${escapedPrefix}${sep}([A-z])\\$${sep}(.*)$`);
        }
        else {
            this.blazorInCodespacesRegexp = new RegExp('');
        }
    }
    absolutePathToUrlRegexp(absolutePath) {
        if (this.options.remoteFilePrefix) {
            // Sample values:
            // absolutePath = C:\\Users\\digeff\\AppData\\Local\\Temp\\97D4F6178D8AD3159C555FA5FACA1ABA807E\\7\\~~\\C$\\workspace\\BlazorApp\\Pages\\Counter.razor
            const filePath = absolutePath.replace(this.blazorInCodespacesRegexp, this.blazorInCodespacesRegexpSubstitution);
            // filePath = C:\\workspace\\BlazorApp\\Pages\\Counter.razor
            const fileUrlPath = utils.platformPathToUrlPath(filePath);
            // fileUrlPath = C:/workspace/BlazorApp/Pages/Counter.razor
            const noColonFileUrlPath = fileUrlPath.replace(/^(\w):(.*)$/, '$1$2');
            // noColonFileUrlPath = C/workspace/BlazorApp/Pages/Counter.razor
            const fileRegexp = utils.urlToRegex(noColonFileUrlPath);
            // fileRegexp = [cC]\\/[wW][oO][rR][kK][sS][pP][aA][cC][eE]\\/[bB][lL][aA][zZ][oO][rR][wW][aA][sS][mM]\\/[pP][aA][gG][eE][sS]\\/[cC][oO][uU][nN][tT][eE][rR]\\.[rR][aA][zZ][oO][rR]
            if (fileRegexp) {
                const dotnetUrlRegexp = `dotnet://.*\\.dll/${fileRegexp}`;
                // dotnetUrlRegexp = dotnet://.*\\.dll/[cC]\\/[wW][oO][rR][kK][sS][pP][aA][cC][eE]\\/[bB][lL][aA][zZ][oO][rR][wW][aA][sS][mM]\\/[pP][aA][gG][eE][sS]\\/[cC][oO][uU][nN][tT][eE][rR]\\.[rR][aA][zZ][oO][rR]
                this.logger.verbose("runtime.breakpoints" /* RuntimeBreakpoints */, 'absolutePathToUrlRegexp.blazor.remoteFs', {
                    absolutePath,
                    dotnetUrlRegexp,
                });
                return Promise.resolve(dotnetUrlRegexp);
            }
        }
        else {
            // Blazor files have a file:/// url. Override the default absolutePathToUrlRegexp which returns an http based regexp
            const fileUrl = utils.absolutePathToFileUrl(absolutePath);
            const fileRegexp = utils.urlToRegex(fileUrl);
            return Promise.resolve(fileRegexp);
        }
        return super.absolutePathToUrlRegexp(absolutePath);
    }
}
exports.BlazorSourcePathResolver = BlazorSourcePathResolver;
//# sourceMappingURL=blazorSourcePathResolver.js.map
//# sourceMappingURL=blazorSourcePathResolver.js.map
