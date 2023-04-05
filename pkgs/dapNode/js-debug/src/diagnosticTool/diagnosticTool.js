"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const preact_1 = require("preact");
const breakpointHelper_1 = require("./breakpointHelper");
const intro_1 = require("./intro");
const sourceExplorer_1 = require("./sourceExplorer");
const useDump_1 = require("./useDump");
const usePersistentState_1 = require("./usePersistentState");
require('../../../src/diagnosticTool/diagnosticTool.css');
const App = ({ dump }) => {
    const [experience, setExperience] = usePersistentState_1.usePersistedState('experience', 0 /* Intro */);
    return (preact_1.h(useDump_1.DumpContext.Provider, { value: dump }, experience === 0 /* Intro */ ? (preact_1.h(intro_1.Intro, { onPick: setExperience })) : (preact_1.h(preact_1.Fragment, null,
        preact_1.h("a", { role: "button", onClick: () => setExperience(0 /* Intro */), className: "back" }, "\u2190 Back"),
        experience === 1 /* BreakpointHelper */ ? preact_1.h(breakpointHelper_1.BreakpointHelper, null) : preact_1.h(sourceExplorer_1.SourceExplorer, null)))));
};
if (typeof DUMP !== 'undefined') {
    preact_1.render(preact_1.h(App, { dump: DUMP }), document.body);
}
else {
    fetch(document.location.search.slice(1))
        .then(res => res.json())
        .then(dump => preact_1.render(preact_1.h(App, { dump: dump }), document.body));
}
//# sourceMappingURL=diagnosticTool.js.map
//# sourceMappingURL=diagnosticTool.js.map
