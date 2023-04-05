"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionButtons = void 0;
const preact_1 = require("preact");
exports.DecisionButtons = (options) => function DecisionButtons({ value, onChange }) {
    return (preact_1.h("div", { className: "decision-buttons" }, options.map(b => (preact_1.h("button", { key: b, onClick: () => onChange(b), className: value === b ? 'active' : '' }, b)))));
};
//# sourceMappingURL=decisionButtons.js.map
//# sourceMappingURL=decisionButtons.js.map
