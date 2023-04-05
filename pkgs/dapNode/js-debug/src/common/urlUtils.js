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
exports.createTargetFilter = exports.requirePageTarget = exports.createTargetFilterForConfig = exports.platformPathToPreferredCase = exports.platformPathToUrlPath = exports.urlPathToPlatformPath = exports.maybeAbsolutePathToFileUrl = exports.isVSCodeWebviewUrl = exports.isFileUrl = exports.urlToRegex = exports.isDataUri = exports.isAbsolute = exports.absolutePathToFileUrl = exports.fileUrlToNetworkPath = exports.fileUrlToAbsolutePath = exports.stripTrailingSlash = exports.escapeForRegExp = exports.isValidUrl = exports.completeUrlEscapingRoot = exports.removeQueryString = exports.completeUrl = exports.isLoopback = exports.isMetaAddress = exports.isLoopbackIp = exports.nearestDirectoryContaining = exports.nearestDirectoryWhere = exports.caseNormalizedMap = exports.comparePathsWithoutCasingOrSlashes = exports.comparePathsWithoutCasing = exports.lowerCaseInsensitivePath = exports.getCaseSensitivePaths = exports.setCaseSensitivePaths = exports.resetCaseSensitivePaths = void 0;
const dns_1 = require("dns");
const path = __importStar(require("path"));
const url_1 = require("url");
const mapUsingProjection_1 = require("./datastructure/mapUsingProjection");
const objUtils_1 = require("./objUtils");
const pathUtils_1 = require("./pathUtils");
const stringUtils_1 = require("./stringUtils");
let isCaseSensitive = process.platform !== 'win32';
function resetCaseSensitivePaths() {
    isCaseSensitive = process.platform !== 'win32';
}
exports.resetCaseSensitivePaths = resetCaseSensitivePaths;
function setCaseSensitivePaths(sensitive) {
    isCaseSensitive = sensitive;
}
exports.setCaseSensitivePaths = setCaseSensitivePaths;
function getCaseSensitivePaths() {
    return isCaseSensitive;
}
exports.getCaseSensitivePaths = getCaseSensitivePaths;
/**
 * Lowercases the path if the filesystem is case-insensitive. Warning: this
 * should only be done for the purposes of comparing paths. Paths returned
 * through DAP and other protocols should be correctly-cased to avoid incorrect
 * disambiguation.
 */
function lowerCaseInsensitivePath(path) {
    return isCaseSensitive ? path : path.toLowerCase();
}
exports.lowerCaseInsensitivePath = lowerCaseInsensitivePath;
/**
 * Compares the paths, case-insensitively based on the platform.
 */
function comparePathsWithoutCasing(a, b) {
    return isCaseSensitive ? a === b : a.toLowerCase() === b.toLowerCase();
}
exports.comparePathsWithoutCasing = comparePathsWithoutCasing;
/**
 * Compares the paths, case-insensitively based on the platform, and
 * normalizing back- and forward-slashes.
 */
function comparePathsWithoutCasingOrSlashes(a, b) {
    return comparePathsWithoutCasing(pathUtils_1.forceForwardSlashes(a), pathUtils_1.forceForwardSlashes(b));
}
exports.comparePathsWithoutCasingOrSlashes = comparePathsWithoutCasingOrSlashes;
function caseNormalizedMap() {
    return getCaseSensitivePaths() ? new Map() : new mapUsingProjection_1.MapUsingProjection(lowerCaseInsensitivePath);
}
exports.caseNormalizedMap = caseNormalizedMap;
/**
 * Returns the closest parent directory where the predicate returns true.
 */
exports.nearestDirectoryWhere = async (rootDir, predicate) => {
    while (true) {
        if (await predicate(rootDir)) {
            return rootDir;
        }
        const parent = path.dirname(rootDir);
        if (parent === rootDir) {
            return undefined;
        }
        rootDir = parent;
    }
};
/**
 * Returns the closest parent directory that contains a file with the given name.
 */
exports.nearestDirectoryContaining = (fsUtils, rootDir, file) => exports.nearestDirectoryWhere(rootDir, p => fsUtils.exists(path.join(p, file)));
// todo: not super correct, and most node libraries don't handle this accurately
const knownLoopbacks = new Set(['localhost', '127.0.0.1', '::1']);
const knownMetaAddresses = new Set([
    '0.0.0.0',
    '::',
    '0000:0000:0000:0000:0000:0000:0000:0000',
]);
/**
 * Checks if the given address, well-formed loopback IPs. We don't need exotic
 * variations like `127.1` because `dns.lookup()` will resolve the proper
 * version for us. The "right" way would be to parse the IP to an integer
 * like Go does (https://golang.org/pkg/net/#IP.IsLoopback).
 */
exports.isLoopbackIp = (ipOrLocalhost) => knownLoopbacks.has(ipOrLocalhost.toLowerCase());
/**
 * If given a URL, returns its hostname.
 */
const getHostnameFromMaybeUrl = (maybeUrl) => {
    try {
        const url = new url_1.URL(maybeUrl);
        // replace brackets in ipv6 addresses:
        return url.hostname.replace(/^\[|\]$/g, '');
    }
    catch (_a) {
        return maybeUrl;
    }
};
/**
 * Gets whether the IP address is a meta-address like 0.0.0.0.
 */
exports.isMetaAddress = (address) => knownMetaAddresses.has(getHostnameFromMaybeUrl(address));
/**
 * Gets whether the IP is a loopback address.
 */
exports.isLoopback = objUtils_1.memoize(async (address) => {
    const ipOrHostname = getHostnameFromMaybeUrl(address);
    if (exports.isLoopbackIp(ipOrHostname)) {
        return true;
    }
    try {
        const resolved = await dns_1.promises.lookup(ipOrHostname);
        return exports.isLoopbackIp(resolved.address);
    }
    catch (_a) {
        return false;
    }
});
function completeUrl(base, relative) {
    try {
        return new url_1.URL(relative, base).href;
    }
    catch (e) { }
}
exports.completeUrl = completeUrl;
function removeQueryString(url) {
    try {
        const parsed = new url_1.URL(url);
        parsed.search = '';
        return parsed.toString();
    }
    catch (_a) {
        return url;
    }
}
exports.removeQueryString = removeQueryString;
// This function allows relative path to escape the root:
// "http://example.com/foo/bar.js" + "../../baz/qux.js" => "http://example.com/../baz/qux.js"
// This allows relative source map sources to reference outside of webRoot.
function completeUrlEscapingRoot(base, relative) {
    try {
        new url_1.URL(relative);
        return relative;
    }
    catch (e) { }
    let url;
    try {
        url = new url_1.URL(base || '');
    }
    catch (e) {
        return relative;
    }
    let s = url.protocol + '//';
    if (url.username)
        s += url.username + ':' + url.password + '@';
    s += url.host;
    s += path.dirname(url.pathname);
    if (s[s.length - 1] !== '/')
        s += '/';
    s += relative;
    return s;
}
exports.completeUrlEscapingRoot = completeUrlEscapingRoot;
function isValidUrl(url) {
    try {
        new url_1.URL(url);
        return true;
    }
    catch (e) {
        return false;
    }
}
exports.isValidUrl = isValidUrl;
function escapeForRegExp(s) {
    const chars = '^[]{}()\\.^$*+?|-,';
    let foundChar = false;
    for (let i = 0; i < chars.length; ++i) {
        if (s.indexOf(chars.charAt(i)) !== -1) {
            foundChar = true;
            break;
        }
    }
    if (!foundChar)
        return s;
    let result = '';
    for (let i = 0; i < s.length; ++i) {
        if (chars.indexOf(s.charAt(i)) !== -1)
            result += '\\';
        result += s.charAt(i);
    }
    return result;
}
exports.escapeForRegExp = escapeForRegExp;
/**
 * Remove a slash of any flavor from the end of the path
 */
function stripTrailingSlash(aPath) {
    return aPath.replace(/\/$/, '').replace(/\\$/, '');
}
exports.stripTrailingSlash = stripTrailingSlash;
function fileUrlToAbsolutePath(urlOrPath) {
    if (isVSCodeWebviewUrl(urlOrPath)) {
        const url = new url_1.URL(urlOrPath);
        // Strip off vscode webview url part: vscode-webview-resource://<36-char-guid>/file...
        urlOrPath = url.pathname
            .replace(/%2F/gi, '/')
            .replace(/^\/([a-z0-9\-]+)(\/{1,2})/i, (_, scheme, sep) => {
            if (sep.length === 1) {
                return `${scheme}:///`; // Add empty authority.
            }
            else {
                return `${scheme}://`; // Url has own authority.
            }
        });
    }
    if (!isFileUrl(urlOrPath)) {
        return undefined;
    }
    urlOrPath = urlOrPath.replace('file:///', '');
    urlOrPath = decodeURIComponent(urlOrPath);
    if (urlOrPath[0] !== '/' && !urlOrPath.match(/^[A-Za-z]:/)) {
        // If it has a : before the first /, assume it's a windows path or url.
        // Ensure unix-style path starts with /, it can be removed when file:/// was stripped.
        // Don't add if the url still has a protocol
        urlOrPath = '/' + urlOrPath;
    }
    return pathUtils_1.fixDriveLetterAndSlashes(urlOrPath);
}
exports.fileUrlToAbsolutePath = fileUrlToAbsolutePath;
/**
 * Converts a file URL to a windows network path, if possible.
 */
function fileUrlToNetworkPath(urlOrPath) {
    if (isFileUrl(urlOrPath)) {
        urlOrPath = urlOrPath.replace('file:///', '\\\\');
        urlOrPath = urlOrPath.replace(/\//g, '\\');
        urlOrPath = decodeURIComponent(urlOrPath);
    }
    return urlOrPath;
}
exports.fileUrlToNetworkPath = fileUrlToNetworkPath;
// TODO: this does not escape/unescape special characters, but it should.
function absolutePathToFileUrl(absolutePath) {
    if (process.platform === 'win32') {
        return 'file:///' + platformPathToUrlPath(absolutePath);
    }
    return 'file://' + platformPathToUrlPath(absolutePath);
}
exports.absolutePathToFileUrl = absolutePathToFileUrl;
/**
 * Returns whether the path is a Windows or posix path.
 */
function isAbsolute(_path) {
    return path.posix.isAbsolute(_path) || path.win32.isAbsolute(_path);
}
exports.isAbsolute = isAbsolute;
/**
 * Returns whether the uri looks like a data URI.
 */
function isDataUri(uri) {
    return /^data:[a-z]+\/[a-z]/.test(uri);
}
exports.isDataUri = isDataUri;
const urlToRegexChar = (char, arr, escapeRegex) => {
    if (!escapeRegex) {
        arr.add(char);
        return;
    }
    if (stringUtils_1.isRegexSpecialChar(char)) {
        arr.add(`\\${char}`);
    }
    else {
        arr.add(char);
    }
    const encoded = encodeURI(char);
    if (char !== '\\' && encoded !== char) {
        arr.add(encoded); // will never have any regex special chars
    }
};
const createReGroup = (patterns) => {
    switch (patterns.size) {
        case 0:
            return '';
        case 1:
            return patterns.values().next().value;
        default:
            // Prefer the more compacy [aA] form if we're only matching single
            // characters, produce a non-capturing group otherwise.
            const arr = [...patterns];
            return arr.some(p => p.length > 1) ? `(?:${arr.join('|')})` : `[${arr.join('')}]`;
    }
};
/**
 * Converts and escape the file URL to a regular expression.
 */
function urlToRegex(aPath, [escapeReStart, escapeReEnd] = [0, aPath.length]) {
    const patterns = [];
    // aPath will often (always?) be provided as a file URI, or URL. Decode it
    // --we'll reencode it as we go--and also create a match for its absolute
    // path.
    //
    // This de- and re-encoding is important for special characters, since:
    //  - It comes in like "file:///c:/foo/%F0%9F%92%A9.js"
    //  - We decode it to file:///c:/foo/💩.js
    //  - For case insensitive systems, we generate a regex like [fF][oO][oO]/(?:💩|%F0%9F%92%A9).[jJ][sS]
    //  - If we didn't de-encode it, the percent would be case-insensitized as
    //    well and we would not include the original character in the regex
    for (const str of [decodeURI(aPath), fileUrlToAbsolutePath(aPath)]) {
        if (!str) {
            continue;
        }
        // Loop through each character of the string. Convert the char to a regex,
        // creating a group, and then append that to the match.
        const chars = new Set();
        let re = '';
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const escapeRegex = i >= escapeReStart && i < escapeReEnd;
            if (isCaseSensitive) {
                urlToRegexChar(char, chars, escapeRegex);
            }
            else {
                urlToRegexChar(char.toLowerCase(), chars, escapeRegex);
                urlToRegexChar(char.toUpperCase(), chars, escapeRegex);
            }
            re += createReGroup(chars);
            chars.clear();
        }
        // If we're on windows but not case sensitive (i.e. we didn't expand a
        // fancy regex above), replace `file:///c:/` or simple `c:/` patterns with
        // an insensitive drive letter.
        patterns.push(re.replace(/^(file:\\\/\\\/\\\/)?([a-z]):/i, (_, file = '', letter) => `${file}[${letter.toUpperCase()}${letter.toLowerCase()}]:`));
    }
    return patterns.join('|');
}
exports.urlToRegex = urlToRegex;
/**
 * Returns whether the string is a file URL
 */
function isFileUrl(candidate) {
    return candidate.startsWith('file:///');
}
exports.isFileUrl = isFileUrl;
/**
 * Returns whether the string is a file URL
 */
function isVSCodeWebviewUrl(candidate) {
    return candidate.startsWith('vscode-webview-resource://');
}
exports.isVSCodeWebviewUrl = isVSCodeWebviewUrl;
function maybeAbsolutePathToFileUrl(rootPath, sourceUrl) {
    if (rootPath &&
        platformPathToPreferredCase(sourceUrl).startsWith(rootPath) &&
        !isValidUrl(sourceUrl))
        return absolutePathToFileUrl(sourceUrl);
    return sourceUrl;
}
exports.maybeAbsolutePathToFileUrl = maybeAbsolutePathToFileUrl;
function urlPathToPlatformPath(p) {
    if (process.platform === 'win32') {
        p = p.replace(/\//g, '\\');
    }
    return decodeURI(p);
}
exports.urlPathToPlatformPath = urlPathToPlatformPath;
function platformPathToUrlPath(p) {
    p = platformPathToPreferredCase(p);
    if (process.platform === 'win32') {
        p = p.replace(/\\/g, '/');
    }
    return encodeURI(p);
}
exports.platformPathToUrlPath = platformPathToUrlPath;
function platformPathToPreferredCase(p) {
    if (p && process.platform === 'win32' && p[1] === ':')
        return p[0].toUpperCase() + p.substring(1);
    return p;
}
exports.platformPathToPreferredCase = platformPathToPreferredCase;
/**
 * Creates a target filter function for the given Chrome configuration.
 */
exports.createTargetFilterForConfig = (config, additonalMatches = []) => {
    const filter = config.urlFilter || config.url || ('file' in config && config.file);
    if (!filter) {
        return () => true;
    }
    const tester = exports.createTargetFilter(filter, ...additonalMatches);
    return t => tester(t.url);
};
/**
 * Requires that the target is also a 'page'.
 */
exports.requirePageTarget = (filter) => t => t.type === "page" /* Page */ && filter(t);
/**
 * The "isURL" from chrome-debug-core. In js-debug we use `new URL()` to see
 * if a string is a URL, but this is slightly different from url.parse.
 * @see https://github.com/microsoft/vscode-chrome-debug-core/blob/456318b2a4b2d3394ce8daae1e70d898f55393ea/src/utils.ts#L310
 */
function isURLCompat(urlOrPath) {
    return !!urlOrPath && !path.isAbsolute(urlOrPath) && !!url_1.parse(urlOrPath).protocol;
}
/**
 * Creates a function to filter a target URL.
 */
exports.createTargetFilter = (...targetUrls) => {
    const standardizeMatch = (aUrl) => {
        aUrl = aUrl.toLowerCase();
        const fileUrl = fileUrlToAbsolutePath(aUrl);
        if (fileUrl) {
            // Strip file:///, if present
            aUrl = fileUrl;
        }
        else if (isURLCompat(aUrl) && aUrl.includes('://')) {
            // Strip the protocol, if present
            aUrl = aUrl.substr(aUrl.indexOf('://') + 3);
        }
        // Remove optional trailing /
        if (aUrl.endsWith('/')) {
            aUrl = aUrl.substr(0, aUrl.length - 1);
        }
        const hashIndex = aUrl.indexOf('#');
        if (hashIndex !== -1) {
            aUrl = aUrl.slice(0, aUrl[hashIndex - 1] === '/' ? hashIndex - 1 : hashIndex);
        }
        return aUrl;
    };
    const escaped = targetUrls.map(url => stringUtils_1.escapeRegexSpecialChars(standardizeMatch(url), '/*').replace(/(\/\*$)|\*/g, '.*'));
    const targetUrlRegex = new RegExp('^(' + escaped.join('|') + ')$', 'g');
    return testUrl => {
        targetUrlRegex.lastIndex = 0;
        return targetUrlRegex.test(standardizeMatch(testUrl));
    };
};
//# sourceMappingURL=urlUtils.js.map
//# sourceMappingURL=urlUtils.js.map
