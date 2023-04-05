"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePersistedState = void 0;
const hooks_1 = require("preact/hooks");
const api = acquireVsCodeApi();
const getComponentState = (name, defaultValue) => {
    var _a;
    const states = ((_a = api.getState()) === null || _a === void 0 ? void 0 : _a.componentState) || {};
    return states.hasOwnProperty(name) ? states[name] : defaultValue;
};
const setComponentState = (name, value) => {
    const state = api.getState();
    api.setState(Object.assign(Object.assign({}, state), { componentState: Object.assign(Object.assign({}, state === null || state === void 0 ? void 0 : state.componentState), { [name]: value }) }));
};
exports.usePersistedState = (name, initialValue) => {
    const [value, setValue] = hooks_1.useState(() => getComponentState(name, initialValue));
    const setWrapped = hooks_1.useCallback((value) => {
        setComponentState(name, value);
        setValue(value);
    }, [name, setValue]);
    return [value, setWrapped];
};
//# sourceMappingURL=usePersistentState.js.map
//# sourceMappingURL=usePersistentState.js.map
