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
exports.GoldenText = exports.removeNodeInternalsStackLines = void 0;
const chai_1 = require("chai");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pathUtils_1 = require("../common/pathUtils");
const stringUtils_1 = require("../common/stringUtils");
const urlUtils = __importStar(require("../common/urlUtils"));
const test_1 = require("./test");
const kStabilizeNames = ['id', 'threadId', 'sourceReference', 'variablesReference'];
const kOmitNames = new Set(['hitBreakpointIds']);
const trimLineWhitespace = (str) => str
    .split('\n')
    .map(l => l.trimRight())
    .join('\n')
    .replace(/\\r\\n/g, '\\n');
exports.removeNodeInternalsStackLines = (s) => s.replace(/^.*<node_internals>.*\r?\n/gm, '');
class GoldenText {
    constructor(testName, workspaceFolder) {
        this._results = [];
        this._testName = testName;
        this._hasNonAssertedLogs = false;
        this._workspaceFolder = urlUtils.platformPathToPreferredCase(workspaceFolder);
    }
    _getLocation() {
        const stack = new Error().stack;
        if (!stack)
            return null;
        const stackFrames = stack.split('\n').slice(1);
        // Find first stackframe that doesn't point to this file.
        for (let frame of stackFrames) {
            frame = frame.trim();
            if (!frame.startsWith('at '))
                return null;
            if (frame.endsWith(')')) {
                const from = frame.indexOf('(');
                frame = frame.substring(from + 1, frame.length - 1);
            }
            else {
                frame = frame.substring('at '.length);
            }
            const match = frame.match(/^(.*):(\d+):(\d+)$/);
            if (!match)
                return null;
            const filePath = match[1];
            // We need to consider .ts files because we may have source-map-support to convert stack traces to .ts
            if (filePath === __filename ||
                filePath === __filename.replace(/[\\/]out([\\/].*).js$/, '$1.ts'))
                continue;
            if (filePath.endsWith('.ts')) {
                return filePath.replace(/([\\/]src[\\/].*).ts$/, `${path.sep}out$1.js`);
            }
            else {
                return filePath;
            }
        }
        return null;
    }
    hasNonAssertedLogs() {
        return this._hasNonAssertedLogs;
    }
    getOutput() {
        return trimLineWhitespace(this._results.join('\n') + '\n');
    }
    /**
     * This method _must_ be called from the test file.
     * The output file will go next to the file from which this is called.
     */
    assertLog(options = {}) {
        let output = this.getOutput();
        this._hasNonAssertedLogs = false;
        if (options.customAssert) {
            options.customAssert(output);
            return;
        }
        if (options.process) {
            output = options.process(output);
        }
        const goldenFilePath = this.findGoldenFilePath();
        if (!fs.existsSync(goldenFilePath)) {
            console.log(`----- Missing expectations file, writing a new one`);
            fs.writeFileSync(goldenFilePath, output, { encoding: 'utf-8' });
        }
        else if (process.env.RESET_RESULTS) {
            fs.writeFileSync(goldenFilePath, output, { encoding: 'utf-8' });
        }
        else {
            const expectations = trimLineWhitespace(fs.readFileSync(goldenFilePath).toString('utf-8'));
            try {
                if (options.substring) {
                    chai_1.expect(output).to.contain(expectations);
                }
                else {
                    chai_1.expect(output).to.equal(expectations);
                }
            }
            catch (err) {
                fs.writeFileSync(goldenFilePath + '.actual', output, { encoding: 'utf-8' });
                throw err;
            }
        }
    }
    findGoldenFilePath() {
        const testFilePath = this._getLocation();
        if (!testFilePath) {
            throw new Error('GoldenText failed to get filename!');
        }
        const fileFriendlyTestName = this._testName
            .trim()
            .toLowerCase()
            .replace(/\s/g, '-')
            .replace(/[^-0-9a-zа-яё]/gi, '');
        const testFileBase = path.resolve(__dirname, '..', '..', '..', 'src', 'test', path.relative(__dirname, path.dirname(testFilePath)), fileFriendlyTestName);
        const platformPath = testFileBase + `.${process.platform}.txt`;
        if (fs.existsSync(platformPath)) {
            return platformPath;
        }
        return testFileBase + '.txt';
    }
    _sanitize(value) {
        // replaces path like C:/testDir/foo/bar.js -> ${testDir}/foo/bar.js
        const replacePath = (needle, replacement) => {
            // Escape special chars, force paths to use forward slashes
            const safeStr = stringUtils_1.escapeRegexSpecialChars(pathUtils_1.forceForwardSlashes(needle), '/');
            // Create an re that allows for any slash delimiter, and looks at the rest of the line
            const re = new RegExp(safeStr.replace(/\//g, '[\\\\/]') + '(.*)', 'gi');
            // Replace it with the ${replacementString} and a forward-slashed version
            // of the rest of the line.
            value = value.replace(re, (_match, trailing) => replacement + pathUtils_1.forceForwardSlashes(trailing));
        };
        value = String(value);
        replacePath(this._workspaceFolder, '${workspaceFolder}');
        replacePath(test_1.testFixturesDir, '${fixturesDir}');
        value = value.replace(/testWorkspace/g, '${workspaceFolder}');
        value = value.replace('/private${fixturesDir}', '${fixturesDir}'); // for osx
        // Don't compare blackboxed code, as this is subject to change between
        // runtime/Node.js versions.
        value = value
            .split('\n')
            .filter(line => !line.includes('hidden: blackboxed'))
            .join('\n');
        return value
            .replace(/VM\d+/g, 'VM<xx>')
            .replace(/\r\n/g, '\n')
            .replace(/@\ .*vscode-pwa(\/|\\)/g, '@ ')
            .replace(/data:text\/html;base64,[a-zA-Z0-9+/]*=?/g, '<data-url>');
    }
    log(item, title, stabilizeNames) {
        this._hasNonAssertedLogs = true;
        if (typeof item === 'object')
            return this._logObject(item, title, stabilizeNames);
        this._results.push((title || '') + this._sanitize(item));
        return item;
    }
    _logObject(object, title, stabilizeNames) {
        stabilizeNames = stabilizeNames || kStabilizeNames;
        const lines = [];
        const dumpValue = (value, prefix, prefixWithName) => {
            if (typeof value === 'object' && value !== null) {
                if (value instanceof Array)
                    dumpItems(value, prefix, prefixWithName);
                else
                    dumpProperties(value, prefix, prefixWithName);
            }
            else {
                lines.push(prefixWithName + this._sanitize(value).replace(/\n/g, ' '));
            }
        };
        function dumpProperties(object, prefix, firstLinePrefix) {
            prefix = prefix || '';
            firstLinePrefix = firstLinePrefix || prefix;
            lines.push(firstLinePrefix + '{');
            const propertyNames = Object.keys(object);
            propertyNames.sort();
            for (let i = 0; i < propertyNames.length; ++i) {
                const name = propertyNames[i];
                if (!object.hasOwnProperty(name) || kOmitNames.has(name))
                    continue;
                const prefixWithName = '    ' + prefix + name + ' : ';
                let value = object[name];
                if (stabilizeNames && stabilizeNames.includes(name))
                    value = `<${typeof value}>`;
                dumpValue(value, '    ' + prefix, prefixWithName);
            }
            lines.push(prefix + '}');
        }
        function dumpItems(object, prefix, firstLinePrefix) {
            prefix = prefix || '';
            firstLinePrefix = firstLinePrefix || prefix;
            lines.push(firstLinePrefix + '[');
            for (let i = 0; i < object.length; ++i)
                dumpValue(object[i], '    ' + prefix, '    ' + prefix + '[' + i + '] : ');
            lines.push(prefix + ']');
        }
        dumpValue(object, '', title || '');
        this._results.push(...lines);
        return object;
    }
}
exports.GoldenText = GoldenText;
//# sourceMappingURL=goldenText.js.map
//# sourceMappingURL=goldenText.js.map
