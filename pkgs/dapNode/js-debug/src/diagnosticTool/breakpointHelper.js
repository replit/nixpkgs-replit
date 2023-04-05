"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreakpointHelper = void 0;
const diff_1 = require("diff");
const preact_1 = require("preact");
const hooks_1 = require("preact/hooks");
const objUtils_1 = require("../common/objUtils");
const decisionButtons_1 = require("./decisionButtons");
const diagnosticPaths_1 = require("./diagnosticPaths");
const useDump_1 = require("./useDump");
const usePersistentState_1 = require("./usePersistentState");
exports.BreakpointHelper = () => {
    const dump = useDump_1.useDump();
    return (preact_1.h(preact_1.Fragment, null, dump.breakpoints.map((bp, i) => (preact_1.h(Breakpoint, { bp: bp, key: i })))));
};
const hasAnyMatchedCdpBreakpoint = (bp, dump) => bp.cdp.some(bp => {
    if ('location' in bp.args) {
        return true; // set by script id
    }
    if (bp.args.url) {
        const url = bp.args.url;
        return dump.sources.some(s => s.url === url);
    }
    if (bp.args.urlRegex) {
        const re = new RegExp(bp.args.urlRegex);
        return dump.sources.some(s => re.test(s.url));
    }
    return false;
});
const buildTracing = (bp, dump) => {
    let key = 0;
    const steps = [
        preact_1.h("li", { key: key++ },
            preact_1.h("p", null, "\u2705 This breakpoint was initially set in:"),
            preact_1.h("p", null,
                preact_1.h("code", null, bp.source.path),
                " line ",
                bp.params.line,
                " column ",
                bp.params.column || 1)),
    ];
    if (!hasAnyMatchedCdpBreakpoint(bp, dump)) {
        steps.push(preact_1.h(FailedToSetLocation, { bp: bp, key: key++ }));
        return steps;
    }
    steps.push(preact_1.h("li", { key: key++ },
        preact_1.h("p", null, "\u2705 In the runtime, the breakpoint was set in:"),
        preact_1.h("p", null,
            preact_1.h("ul", null, bp.cdp.map((cdp, i) => (preact_1.h(CdpBreakpoint, { cdp: cdp, index: i, key: i })))))));
    const applied = bp.cdp.filter(cdp => cdp.state === 1 /* Applied */);
    const uiLocations = objUtils_1.flatten(applied.map(a => (a.state === 1 /* Applied */ ? a.uiLocations : [])));
    if (!uiLocations.length) {
        steps.push(preact_1.h("li", { key: key++ },
            preact_1.h(NoUiLocation, null)));
        return steps;
    }
    steps.push(preact_1.h("li", { key: key++ },
        preact_1.h("p", null, "\u2705 The runtime acknowledged and adjusted the breakpoint, and it mapped back to the following locations:"),
        preact_1.h("ul", null, uiLocations.map((l, i) => (preact_1.h(UiLocation, { loc: l, key: i }))))), preact_1.h("li", { key: key++ },
        preact_1.h("p", null,
            "If this is not right, your compiled code might be out of date with your sources. If you don't think this is the case and something else is wrong, please",
            ' ',
            preact_1.h("a", { href: "https://github.com/microsoft/vscode-js-debug/issues/new/choose" }, "open an issue"),
            "!")));
    return steps;
};
const NoUiLocation = () => {
    const dump = useDump_1.useDump();
    return (preact_1.h("p", null,
        "\u2753 We sent the breakpoint, but it didn't bind to any locations. If this is unexpected:",
        preact_1.h("ul", null,
            preact_1.h("li", null,
                "Make sure that your program is loading or running this script. You can add a",
                ' ',
                preact_1.h("code", null, "debugger;"),
                " statement to check this: your program will pause when it hits it."),
            preact_1.h("li", null, "If your breakpoint is set in certain places, such as on the last empty line of a file, the runtime might not be able to find anywhere to place it."),
            diagnosticPaths_1.isNodeType(dump) && (preact_1.h("li", null,
                "Unless you",
                ' ',
                preact_1.h("a", { href: "https://code.visualstudio.com/docs/nodejs/nodejs-debugging#_breakpoint-validation" }, "run with --nolazy"),
                ", Node.js might not resolve breakpoints for code it hasn't parsed yet.")),
            preact_1.h("li", null, "If necessary, make sure your compiled files are up-to-date with your source files."))));
};
const Breakpoint = ({ bp }) => {
    if (!bp.source.path) {
        return null;
    }
    const dump = useDump_1.useDump();
    return (preact_1.h("div", { className: "content source-container" },
        preact_1.h("h2", null,
            diagnosticPaths_1.prettyName({ absolutePath: bp.source.path, url: bp.source.path }, dump),
            ":",
            bp.params.line,
            ":",
            bp.params.column || 1),
        preact_1.h("ul", { className: "bp-tracing" }, buildTracing(bp, dump))));
};
const FailedToSetLocation = ({ bp }) => {
    const dump = useDump_1.useDump();
    const desiredBasename = diagnosticPaths_1.basename({ url: bp.source.path });
    const matchingSources = dump.sources.filter(src => diagnosticPaths_1.basename(src) === desiredBasename);
    if (!matchingSources.length) {
        return (preact_1.h("li", null,
            preact_1.h("p", null,
                preact_1.h(NoMatchingSourceHelper, { basename: desiredBasename }))));
    }
    return (preact_1.h("li", null,
        preact_1.h("p", null, "\u2753 We couldn't find a corresponding source location, but found some other files with the same name:"),
        preact_1.h("ul", null, matchingSources.map(s => (preact_1.h("li", { key: s },
            preact_1.h(TextDiff, { original: bp.source.path, updated: s.absolutePath || s.url }))))),
        diagnosticPaths_1.isBrowserType(dump) ? (preact_1.h("p", null,
            "You may need to adjust the ",
            preact_1.h("code", null, "webRoot"),
            " in your ",
            preact_1.h("code", null, "launch.json"),
            " if you're building from a subfolder, or tweak your ",
            preact_1.h("code", null, "sourceMapPathOverrides"),
            ".")) : (preact_1.h("p", null,
            "If this is the same file, you may need to adjust your build tool",
            ' ',
            diagnosticPaths_1.isBrowserType(dump) && (preact_1.h(preact_1.Fragment, null,
                "or ",
                preact_1.h("code", null, "webRoot"),
                " in the launch.json")),
            ' ',
            "to correct the paths."))));
};
const TextDiff = ({ original, updated, }) => (preact_1.h("span", { className: "text-diff" }, diff_1.diffChars(original, updated, { ignoreCase: true }).map((diff, i) => (preact_1.h("span", { className: diff.added ? 'add' : diff.removed ? 'rm' : '', key: i }, diff.value)))));
const UiLocation = ({ loc }) => {
    var _a, _b;
    const dump = useDump_1.useDump();
    const source = dump.sources.find(s => s.sourceReference === loc.sourceReference);
    return (preact_1.h(preact_1.Fragment, null,
        preact_1.h("code", null, (_b = (_a = source === null || source === void 0 ? void 0 : source.absolutePath) !== null && _a !== void 0 ? _a : source === null || source === void 0 ? void 0 : source.url) !== null && _b !== void 0 ? _b : 'unknown'),
        " line ",
        loc.lineNumber,
        " column",
        ' ',
        loc.columnNumber));
};
const CdpBreakpoint = ({ cdp, index, }) => {
    var _a;
    const dump = useDump_1.useDump();
    const [showRegex, setShowRegex] = usePersistentState_1.usePersistedState(`showCdpBp${index}`, false);
    const { url, line, col, regex } = 'location' in cdp.args
        ? {
            url: (_a = dump.sources.find(s => !s.compiledSourceRefToUrl &&
                s.scriptIds.includes(cdp.args.location.scriptId))) === null || _a === void 0 ? void 0 : _a.url,
            regex: undefined,
            line: cdp.args.location.lineNumber + 1,
            col: (cdp.args.location.columnNumber || 0) + 1,
        }
        : {
            url: cdp.args.urlRegex ? demangleUrlRegex(cdp.args.urlRegex) : cdp.args.url,
            regex: cdp.args.urlRegex,
            line: cdp.args.lineNumber + 1,
            col: (cdp.args.columnNumber || 0) + 1,
        };
    return (preact_1.h("li", null,
        preact_1.h("p", null,
            preact_1.h("code", null, url),
            " line ",
            line,
            " column ",
            col,
            ' ',
            regex && preact_1.h("a", { onClick: () => setShowRegex(!showRegex) }, "via this regex")),
        showRegex && (preact_1.h("p", null,
            preact_1.h("code", null, regex)))));
};
const demangleUrlRegex = (re) => re
    .replace(/\[([[a-z])[A-Z]\]/g, (_, letter) => letter) // ugly case-sensivity regex groups
    .replace(/\\\\/, '\\') // escaped backslashes
    .replace(/\\\//g, '/') // escaped forward slashes
    .replace(/\|.+$/g, '') // drive absolute path (only keep file uri)
    .replace(/\\\./g, '.'); // escaped .
const NoMatchingDecisionButtons = decisionButtons_1.DecisionButtons([
    "Loaded in directly" /* Direct */,
    "Be parsed from a sourcemap" /* SourceMap */,
]);
const NoMatchingSourceHelper = ({ basename }) => {
    const dump = useDump_1.useDump();
    const [hint, setHint] = hooks_1.useState(!basename.endsWith('.js') ? "Be parsed from a sourcemap" /* SourceMap */ : undefined);
    return (preact_1.h(preact_1.Fragment, null,
        preact_1.h("p", null,
            "\u2753 We couldn't find a corresponding source location, and didn't find any source with the name ",
            preact_1.h("code", null, basename),
            "."),
        preact_1.h("p", null,
            "How did you expect this file to be loaded? (If you have a compilation step, you should pick 'sourcemap')",
            preact_1.h(NoMatchingDecisionButtons, { onChange: setHint, value: hint }),
            hint === "Loaded in directly" /* Direct */ &&
                (diagnosticPaths_1.isBrowserType(dump) ? (preact_1.h("p", null,
                    "It looks like your webpage didn't load this script; breakpoints won't be bound until the file they're set in is loaded. Make sure your script is imported from the right location using a ",
                    preact_1.h("code", null, '<script>'),
                    " tag.")) : (preact_1.h("p", null,
                    "It looks like your program didn't load this script; breakpoints won't be bound until the file they're set in is loaded. Make sure your script is imported with a",
                    ' ',
                    preact_1.h("code", null, "require()"),
                    " or ",
                    preact_1.h("code", null, "import"),
                    " statement, such as",
                    ' ',
                    preact_1.h("code", null,
                        "require('./",
                        basename,
                        "')"),
                    "."))),
            hint === "Be parsed from a sourcemap" /* SourceMap */ && (preact_1.h("p", null,
                "Here's some hints that might help you:",
                preact_1.h("ul", null,
                    /\.tsx?$/.test(basename) ? (preact_1.h("li", null,
                        "Make sure you have ",
                        preact_1.h("code", null, "\"sourceMap\": true"),
                        " in your tsconfig to generate sourcemaps.")) : (preact_1.h("li", null, "Make sure your build tool is set up to create sourcemaps.")),
                    !dump.config.outFiles.includes('!**/node_modules/**') && (preact_1.h("li", null,
                        "It looks like you narrowed the ",
                        preact_1.h("code", null, "outFiles"),
                        " in your launch.json. Try removing this: it now defaults to the whole workspace, and overspecifying it can unnecessarily narrow places where we'll resolve sourcemaps."))))))));
};
//# sourceMappingURL=breakpointHelper.js.map
//# sourceMappingURL=breakpointHelper.js.map
