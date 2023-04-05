"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.BootloaderEnvironment = exports.variableDelimiter = void 0;
exports.variableDelimiter = ':::';
class BootloaderEnvironment {
    constructor(processEnv) {
        this.processEnv = processEnv;
    }
    get nodeOptions() {
        return this.processEnv.NODE_OPTIONS;
    }
    set nodeOptions(value) {
        if (value === undefined) {
            delete this.processEnv.NODE_OPTIONS;
        }
        else {
            this.processEnv.NODE_OPTIONS = value;
        }
    }
    get inspectorOptions() {
        const value = this.processEnv.VSCODE_INSPECTOR_OPTIONS;
        if (!value) {
            return undefined;
        }
        const ownOptions = value.split(exports.variableDelimiter).find(v => !!v);
        if (!ownOptions) {
            return;
        }
        try {
            return JSON.parse(ownOptions);
        }
        catch (_a) {
            return undefined;
        }
    }
    set inspectorOptions(value) {
        if (value === undefined) {
            delete this.processEnv.VSCODE_INSPECTOR_OPTIONS;
        }
        else {
            this.processEnv.VSCODE_INSPECTOR_OPTIONS = JSON.stringify(value);
        }
    }
    /**
     * Unsets inspector options for this and all child processes.
     */
    unsetForTree() {
        delete this.processEnv.VSCODE_INSPECTOR_OPTIONS;
    }
    /**
     * Updates a single inspector option key/value.
     */
    updateInspectorOption(key, value) {
        const options = this.inspectorOptions;
        if (options) {
            this.inspectorOptions = Object.assign(Object.assign({}, options), { [key]: value });
        }
    }
}
exports.BootloaderEnvironment = BootloaderEnvironment;
//# sourceMappingURL=environment.js.map
//# sourceMappingURL=environment.js.map
