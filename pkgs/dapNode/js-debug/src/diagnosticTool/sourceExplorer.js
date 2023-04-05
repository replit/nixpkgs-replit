"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Source = exports.SourceExplorer = void 0;
const preact_1 = require("preact");
const hooks_1 = require("preact/hooks");
const objUtils_1 = require("../common/objUtils");
const diagnosticPaths_1 = require("./diagnosticPaths");
const useDump_1 = require("./useDump");
const usePersistentState_1 = require("./usePersistentState");
exports.SourceExplorer = () => {
    const dump = useDump_1.useDump();
    const uniqueIdMap = hooks_1.useMemo(() => {
        const map = new Map();
        for (const source of dump.sources) {
            map.set(source.uniqueId, source);
        }
        return map;
    }, [dump.sources]);
    const indexed = hooks_1.useMemo(() => dump.sources
        .map(source => [
        [source.url, source.absolutePath, source.prettyName].join(' ').toLowerCase(),
        source,
    ])
        .sort((a, b) => diagnosticPaths_1.sortScore(a[1]) - diagnosticPaths_1.sortScore(b[1])), [dump.sources]);
    const [filter, setFilter] = usePersistentState_1.usePersistedState('filter', '');
    const results = hooks_1.useMemo(() => filter
        ? indexed.filter(([str]) => str.includes(filter.toLowerCase())).map(([, src]) => src)
        : indexed.map(i => i[1]), [indexed, filter]);
    const onChange = hooks_1.useCallback((evt) => setFilter(evt.target.value), []);
    return (preact_1.h(preact_1.Fragment, null,
        preact_1.h("input", { placeholder: "Filter sources...", className: "source-filter", value: filter, onChange: onChange, onKeyUp: onChange }),
        preact_1.h("small", { style: { marginBottom: '1rem' } },
            "Showing ",
            results.length,
            " of ",
            dump.sources.length,
            " sources..."),
        results.map(result => (preact_1.h(exports.Source, { source: result, allSources: uniqueIdMap, key: result.sourceReference })))));
};
exports.Source = ({ source, allSources }) => {
    const [rawBreadcrumbs, setBreadcrumbs] = usePersistentState_1.usePersistedState(`sourceBreadCrumbs${source.uniqueId}`, [source.uniqueId]);
    const breadcrumbs = hooks_1.useMemo(() => rawBreadcrumbs.map(b => allSources.get(b)).filter(objUtils_1.truthy), [
        allSources,
        rawBreadcrumbs,
    ]);
    const [expanded, setExpanded] = usePersistentState_1.usePersistedState(`sourceExpanded${source.uniqueId}`, false);
    const dump = useDump_1.useDump();
    const toggleExpand = hooks_1.useCallback(() => setExpanded(!expanded), [expanded]);
    return (preact_1.h("div", { className: `source-container ${expanded ? ' expanded' : ''}` },
        preact_1.h("h2", { onClick: toggleExpand }, diagnosticPaths_1.prettyName(source, dump)),
        expanded && (preact_1.h(preact_1.Fragment, null,
            breadcrumbs.length > 1 && preact_1.h(Breadcrumbs, { sources: breadcrumbs, update: setBreadcrumbs }),
            preact_1.h(SourceData, { source: breadcrumbs[breadcrumbs.length - 1], open: sourceReference => {
                    const src = dump.sources.find(s => s.sourceReference === sourceReference);
                    if (src) {
                        setBreadcrumbs(rawBreadcrumbs.concat(src.uniqueId));
                    }
                } })))));
};
const Breadcrumbs = ({ sources, update }) => (preact_1.h("ol", { className: "source-breadcrumbs" }, sources.map((source, i) => {
    const label = `${diagnosticPaths_1.basename(source)} (#${source.sourceReference})`;
    if (i === sources.length - 1) {
        return preact_1.h("li", null, label);
    }
    return (preact_1.h("li", { key: i },
        preact_1.h("a", { key: i, onClick: () => update(sources.slice(0, i + 1).map(s => s.uniqueId)) }, label),
        ' ',
        "\u00BB",
        ' '));
})));
const SourceData = ({ source, open }) => (preact_1.h("dl", { className: "source-data-grid" },
    preact_1.h("dt", null, "url"),
    preact_1.h("dd", null,
        preact_1.h("code", null, source.url)),
    preact_1.h("dt", null, "sourceReference"),
    preact_1.h("dd", null,
        preact_1.h("code", null, source.sourceReference)),
    preact_1.h("dt", null, "absolutePath"),
    preact_1.h("dd", null,
        preact_1.h("code", null, source.absolutePath)),
    preact_1.h("dt", null, "absolutePath verified?"),
    preact_1.h("dd", null, source.compiledSourceRefToUrl
        ? '✅ From sourcemap, assumed correct'
        : source.actualAbsolutePath
            ? '✅ Verified on disk'
            : '❌ Disk verification failed (does not exist or different content)'),
    preact_1.h("dt", null, "sourcemap children:"),
    preact_1.h("dd", null, source.sourceMap ? (preact_1.h("ul", null, Object.entries(source.sourceMap.sources).map(([url, ref]) => (preact_1.h("li", { key: url },
        preact_1.h(ReferencedSource, { url: url, sourceRef: ref, pick: open })))))) : ('None (does not have a sourcemap)')),
    preact_1.h("dt", null, "referenced from sourcemap:"),
    preact_1.h("dd", null, source.compiledSourceRefToUrl ? (preact_1.h("ul", null, source.compiledSourceRefToUrl.map(([ref, url]) => (preact_1.h("li", { key: url },
        preact_1.h(SourceFromReference, { url: url, sourceRef: ref, pick: open })))))) : ('None (not from a sourcemap)'))));
const ReferencedSource = ({ url, sourceRef, pick }) => {
    const dump = useDump_1.useDump();
    const src = dump.sources.find(s => s.sourceReference === sourceRef);
    const onClick = hooks_1.useCallback(() => pick(sourceRef), [sourceRef]);
    return (preact_1.h(preact_1.Fragment, null,
        url,
        " \u2192 ",
        preact_1.h("a", { onClick: onClick }, src ? `${diagnosticPaths_1.basename(src)} (#${sourceRef})` : 'unknown')));
};
const SourceFromReference = ({ url, sourceRef, pick }) => {
    const dump = useDump_1.useDump();
    const src = dump.sources.find(s => s.sourceReference === sourceRef);
    const onClick = hooks_1.useCallback(() => pick(sourceRef), [sourceRef]);
    return (preact_1.h(preact_1.Fragment, null,
        preact_1.h("a", { onClick: onClick }, src ? `${diagnosticPaths_1.basename(src)} (#${sourceRef})` : 'unknown'),
        " as ",
        url,
        ' ',
        "\u2192 this"));
};
//# sourceMappingURL=sourceExplorer.js.map
//# sourceMappingURL=sourceExplorer.js.map
