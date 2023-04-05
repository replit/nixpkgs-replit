"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Intro = void 0;
const preact_1 = require("preact");
exports.Intro = ({ onPick }) => (preact_1.h("div", { className: "intro" },
    preact_1.h("div", null,
        preact_1.h("header", null, "Debug Doctor"),
        preact_1.h("div", { className: "intro-content" },
            preact_1.h("p", null, "What are you trying to find out?"),
            preact_1.h("ul", null,
                preact_1.h("li", null,
                    preact_1.h("a", { role: "button", onClick: () => onPick(1 /* BreakpointHelper */) }, "Why my breakpoints don't bind")),
                preact_1.h("li", null,
                    preact_1.h("a", { role: "button", onClick: () => onPick(2 /* SourceExplorer */) }, "What scripts and sourcemaps are loaded")),
                preact_1.h("li", null,
                    preact_1.h("a", { href: "https://github.com/microsoft/vscode-js-debug/issues/new/choose" }, "Something else...")))))));
//# sourceMappingURL=intro.js.map
//# sourceMappingURL=intro.js.map
