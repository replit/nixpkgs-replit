"use strict";
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
exports.EnvironmentVars = exports.getSanitizeProcessEnv = void 0;
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
const path = __importStar(require("path"));
const objUtils_1 = require("./objUtils");
/**
 * @see https://github.com/microsoft/vscode/blob/97664e1452b68b5b6eedce95eaa79956fada01b5/src/vs/base/common/processes.ts#L104
 */
function getSanitizeProcessEnv(base) {
    const keysToRemove = [
        /^APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL$/i,
        /^ELECTRON_.+$/i,
        /^GOOGLE_API_KEY$/i,
        /^VSCODE_.+$/i,
        /^SNAP(|_.*)$/i,
        /^GDK_PIXBUF_.+$/i,
    ];
    return new EnvironmentVars(base).map((key, value) => keysToRemove.some(re => re.test(key)) ? undefined : value);
}
exports.getSanitizeProcessEnv = getSanitizeProcessEnv;
/**
 * Container for holding sets of environment variables. Deals with case
 * sensitivity issues in Windows.
 */
class EnvironmentVars {
    constructor(vars) {
        /**
         * Returns a map of defined environment variables.
         */
        this.defined = objUtils_1.once(() => objUtils_1.removeNulls(this.value));
        this.value = vars ? objUtils_1.removeUndefined(vars) : {};
    }
    /**
     * Looks up an environment variable property.
     */
    lookup(prop) {
        return EnvironmentVars.platform === 'win32'
            ? objUtils_1.getCaseInsensitiveProperty(this.value, prop)
            : this.value[prop];
    }
    /**
     * Adds the given location to the environment PATH.
     */
    addToPath(location, prependOrAppend = 'append', includePlaceholder = false) {
        const prop = EnvironmentVars.platform === 'win32' ? 'Path' : 'PATH';
        const delimiter = EnvironmentVars.platform === 'win32' ? path.win32.delimiter : path.posix.delimiter;
        let value = this.lookup(prop);
        if (includePlaceholder && !value) {
            value = `\${env:${prop}}`;
        }
        if (!value) {
            value = location;
        }
        else if (prependOrAppend === 'append') {
            value = value + delimiter + location;
        }
        else {
            value = location + delimiter + value;
        }
        return this.update(prop, value);
    }
    /**
     * Adds a value to the NODE_OPTIONS arg.
     */
    addNodeOption(option) {
        const existing = this.lookup('NODE_OPTIONS');
        return this.update('NODE_OPTIONS', existing ? `${existing} ${option}` : option);
    }
    /**
     * Creates a new set of environment variables with the given update.
     */
    update(prop, value) {
        return EnvironmentVars.merge(this, { [prop]: value });
    }
    /**
     * Merges these environment variables with the other set.
     */
    merge(...vars) {
        return EnvironmentVars.merge(this, ...vars);
    }
    /**
     * Maps the environment variables. If the mapper function returns undefined,
     * the value is not included in the resulting set of variables.
     */
    map(mapper) {
        return new EnvironmentVars(objUtils_1.mapValues(this.value, (v, k) => mapper(k, v)));
    }
    /**
     * Merges the sets of environment variables together.
     */
    static merge(...vars) {
        const objects = vars.map(v => (v instanceof EnvironmentVars ? v.value : v));
        const result = EnvironmentVars.platform === 'win32'
            ? objUtils_1.caseInsensitiveMerge(...objects)
            : Object.assign({}, ...objects);
        return new EnvironmentVars(result);
    }
}
exports.EnvironmentVars = EnvironmentVars;
/**
 * Current process platform.
 */
EnvironmentVars.platform = process.platform;
/**
 * An empty set of environment variables.
 */
EnvironmentVars.empty = new EnvironmentVars({});
/**
 * Process environment, sanitized of any VS Code specific variables.
 */
EnvironmentVars.processEnv = objUtils_1.once(() => getSanitizeProcessEnv(process.env));
//# sourceMappingURL=environmentVars.js.map
//# sourceMappingURL=environmentVars.js.map
