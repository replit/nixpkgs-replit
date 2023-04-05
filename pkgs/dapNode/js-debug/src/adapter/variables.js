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
exports.VariableStore = void 0;
const astring_1 = require("astring");
const nls = __importStar(require("vscode-nls"));
const objUtils_1 = require("../common/objUtils");
const sourceCodeManipulations_1 = require("../common/sourceCodeManipulations");
const errors = __importStar(require("../dap/errors"));
const objectPreview = __importStar(require("./objectPreview"));
const templates_1 = require("./templates");
const getArrayProperties_1 = require("./templates/getArrayProperties");
const getArraySlots_1 = require("./templates/getArraySlots");
const invokeGetter_1 = require("./templates/invokeGetter");
const localize = nls.loadMessageBundle();
class RemoteObject {
    constructor(name, cdp, object, parent, renamedFromSource) {
        this.name = name;
        this.parent = parent;
        this.renamedFromSource = renamedFromSource;
        /**
         * For functions, returns whether it should be evaluated when inspected.
         * This can be set on side-effect-free objects like accessors who should
         * have their value replaced.
         */
        this.evaluteOnInspect = false;
        this.o = object;
        // eslint-disable-next-line
        this.objectId = object.objectId;
        this.cdp = cdp;
    }
    /**
     * Gets the accessor though which this object can be read.
     */
    get accessor() {
        if (!this.parent || !this.parent.accessor) {
            return String(this.name);
        }
        if (typeof this.name === 'number' || /^[0-9]+$/.test(this.name)) {
            return `${this.parent.accessor}[${this.name}]`;
        }
        // If the object property looks like a valid identifer, don't use the
        // bracket syntax -- it's ugly!
        if (/^[$a-z_][0-9a-z_$]*$/i.test(this.name)) {
            return `${this.parent.accessor}.${this.name}`;
        }
        return `${this.parent.accessor}[${JSON.stringify(this.name)}]`;
    }
    wrap(property, object) {
        return object ? new RemoteObject(property, this.cdp, object, this) : undefined;
    }
}
class VariableStore {
    constructor(cdp, delegate, renameProvider, autoExpandGetters, customDescriptionGenerator, customPropertiesGenerator) {
        this.renameProvider = renameProvider;
        this.autoExpandGetters = autoExpandGetters;
        this.customDescriptionGenerator = customDescriptionGenerator;
        this.customPropertiesGenerator = customPropertiesGenerator;
        this._referenceToVariables = new Map();
        this._objectToReference = new Map();
        this._referenceToObject = new Map();
        this._cdp = cdp;
        this._delegate = delegate;
    }
    createDetached() {
        return new VariableStore(this._cdp, this._delegate, this.renameProvider, this.autoExpandGetters, this.customDescriptionGenerator, this.customPropertiesGenerator);
    }
    hasVariables(variablesReference) {
        return (this._referenceToVariables.has(variablesReference) ||
            this._referenceToObject.has(variablesReference));
    }
    async getVariables(params) {
        const result = this._referenceToVariables.get(params.variablesReference);
        if (result)
            return await result();
        const object = this._referenceToObject.get(params.variablesReference);
        if (!object) {
            return [];
        }
        if (object.scopeVariables) {
            return object.scopeVariables;
        }
        if (object.evaluteOnInspect && object.parent) {
            try {
                const result = await invokeGetter_1.invokeGetter({
                    cdp: object.cdp,
                    objectId: object.parent.objectId,
                    args: [object.name],
                });
                return [await this._createVariable('', object.parent.wrap(object.name, result), 'repl')];
            }
            catch (e) {
                if (!(e instanceof templates_1.RemoteException)) {
                    throw e;
                }
                // continue
            }
        }
        if (objectPreview.isArray(object.o)) {
            if (params && params.filter === 'indexed')
                return this._getArraySlots(object, params);
            if (params && params.filter === 'named')
                return this._getArrayProperties(object);
            const names = await this._getArrayProperties(object);
            const indexes = await this._getArraySlots(object, params);
            return indexes.concat(names);
        }
        const variables = await this._getObjectProperties(object);
        if (object.scopeRef) {
            const existingVariables = new Set(variables.map(v => v.name));
            /* Normally we add the "this" variable as en extra propertie because it's not included in the variables
             * that come from v8. Blazor does include it, and we don't know what other CDP debuggers will do, so we
             * avoid adding duplicated variables.
             */
            for (const extraProperty of object.extraProperties || [])
                if (!existingVariables.has(extraProperty.name))
                    variables.push(await this._createVariable(extraProperty.name, object.wrap(extraProperty.name, extraProperty.value), 'propertyValue'));
            object.scopeVariables = variables;
        }
        return variables;
    }
    async setVariable(params) {
        const object = this._referenceToObject.get(params.variablesReference);
        if (!object)
            return errors.createSilentError(localize('error.variableNotFound', 'Variable not found'));
        if (!params.value)
            return errors.createUserError(localize('error.emptyExpression', 'Cannot set an empty value'));
        const expression = params.value + templates_1.getSourceSuffix();
        const evaluateResponse = object.scopeRef
            ? await object.cdp.Debugger.evaluateOnCallFrame({
                expression: expression,
                callFrameId: object.scopeRef.callFrameId,
            })
            : await object.cdp.Runtime.evaluate({ expression, silent: true });
        if (!evaluateResponse)
            return errors.createUserError(localize('error.invalidExpression', 'Invalid expression'));
        if (evaluateResponse.exceptionDetails)
            return errorFromException(evaluateResponse.exceptionDetails);
        return this.handleSetVariableEvaluation(params, evaluateResponse, object);
    }
    async handleSetVariableEvaluation(params, evaluateResponse, object) {
        function release(error) {
            const objectId = evaluateResponse.result.objectId;
            if (objectId)
                object.cdp.Runtime.releaseObject({ objectId });
            return error;
        }
        if (object.scopeRef) {
            if (object.extraProperties && object.extraProperties.find(p => p.name === params.name))
                return release(errors.createSilentError(localize('error.variableNotFound', 'Variable not found')));
            const setResponse = await object.cdp.Debugger.setVariableValue({
                callFrameId: object.scopeRef.callFrameId,
                scopeNumber: object.scopeRef.scopeNumber,
                variableName: params.name,
                newValue: this._toCallArgument(evaluateResponse.result),
            });
            if (!setResponse)
                return release(errors.createSilentError(localize('error.setVariableDidFail', 'Unable to set variable value')));
        }
        else {
            const setResponse = await object.cdp.Runtime.callFunctionOn({
                objectId: object.objectId,
                functionDeclaration: `function(a, b) { this[a] = b; ${templates_1.getSourceSuffix()} }`,
                arguments: [
                    this._toCallArgument(params.name),
                    this._toCallArgument(evaluateResponse.result),
                ],
                silent: true,
            });
            if (!setResponse)
                return release(errors.createSilentError(localize('error.setVariableDidFail', 'Unable to set variable value')));
            if (setResponse.exceptionDetails)
                return release(errorFromException(setResponse.exceptionDetails));
        }
        const variable = await this._createVariable(params.name, new RemoteObject(params.name, object.cdp, evaluateResponse.result));
        const result = {
            value: variable.value,
            type: variable.type,
            variablesReference: variable.variablesReference,
            namedVariables: variable.namedVariables,
            indexedVariables: variable.indexedVariables,
        };
        if (object.scopeVariables) {
            const index = object.scopeVariables.findIndex(v => v.name === params.name);
            if (index !== -1)
                object.scopeVariables[index] = variable;
        }
        return result;
    }
    async createVariableForWatchEval(value, watchExpr) {
        return this._createVariable('', new RemoteObject(`(${watchExpr})`, this._cdp, value), 'watch');
    }
    async createVariable(value, context) {
        return this._createVariable('', new RemoteObject('', this._cdp, value), context);
    }
    async createScope(value, scopeRef, extraProperties) {
        const object = new RemoteObject('', this._cdp, value);
        object.scopeRef = scopeRef;
        object.extraProperties = extraProperties;
        return this._createVariable('', object);
    }
    /**
     * Returns the variable reference for a complex, object-including output.
     */
    async createVariableForOutput(text, args, stackTrace) {
        let rootObjectVariable;
        if (args.length === 1 && objectPreview.previewAsObject(args[0]) && !stackTrace) {
            rootObjectVariable = await this._createVariable('', new RemoteObject('', this._cdp, args[0]));
            rootObjectVariable.value = text;
        }
        else {
            const rootObjectReference = stackTrace || args.find(a => objectPreview.previewAsObject(a))
                ? ++VariableStore._lastVariableReference
                : 0;
            rootObjectVariable = {
                name: '',
                value: text,
                variablesReference: rootObjectReference,
            };
            this._referenceToVariables.set(rootObjectReference, () => this._createVariableForOutputParams(args, stackTrace));
        }
        const resultReference = ++VariableStore._lastVariableReference;
        this._referenceToVariables.set(resultReference, async () => [rootObjectVariable]);
        return resultReference;
    }
    async _createVariableForOutputParams(args, stackTrace) {
        const params = [];
        for (let i = 0; i < args.length; ++i) {
            if (!objectPreview.previewAsObject(args[i]))
                continue;
            params.push(await this._createVariable(`arg${i}`, new RemoteObject(`arg${i}`, this._cdp, args[i]), 'repl'));
        }
        if (stackTrace) {
            const stackTraceVariable = {
                name: '',
                value: await stackTrace.format(),
                variablesReference: 0,
            };
            params.push(stackTraceVariable);
        }
        return params;
    }
    async clear() {
        this._referenceToVariables.clear();
        this._objectToReference.clear();
        this._referenceToObject.clear();
    }
    async _getObjectProperties(object, objectId = object.objectId) {
        var _a;
        const properties = [];
        if (this.customPropertiesGenerator) {
            const { result, errorDescription } = await this.evaluateCodeForObject(object, [], this.customPropertiesGenerator, [], 
            /*catchAndReturnErrors*/ false);
            if (result && result.type !== 'undefined') {
                object = new RemoteObject(object.name, object.cdp, result, object.parent);
                objectId = object.objectId;
            }
            else {
                const value = (result === null || result === void 0 ? void 0 : result.description) || errorDescription || localize('error.unknown', 'Unknown error');
                properties.push([
                    {
                        v: {
                            name: localize('error.failedToCustomizeObjectProperties', `Failed properties customization`),
                            value,
                            variablesReference: 0,
                        },
                        weight: 0,
                    },
                ]);
            }
        }
        const [accessorsProperties, ownProperties] = await Promise.all([
            object.cdp.Runtime.getProperties({
                objectId,
                accessorPropertiesOnly: true,
                ownProperties: false,
                generatePreview: true,
            }),
            object.cdp.Runtime.getProperties({
                objectId,
                ownProperties: true,
                generatePreview: true,
            }),
        ]);
        if (!accessorsProperties || !ownProperties)
            return [];
        // Merge own properties and all accessors.
        const propertiesMap = new Map();
        const propertySymbols = [];
        for (const property of accessorsProperties.result) {
            if (property.symbol)
                propertySymbols.push(property);
            else
                propertiesMap.set(property.name, property);
        }
        for (const property of ownProperties.result) {
            if (property.get || property.set)
                continue;
            if (property.symbol)
                propertySymbols.push(property);
            else
                propertiesMap.set(property.name, property);
        }
        for (const property of (_a = ownProperties.privateProperties) !== null && _a !== void 0 ? _a : []) {
            propertiesMap.set(property.name, property);
        }
        // Push own properties & accessors and symbols
        for (const propertiesCollection of [propertiesMap.values(), propertySymbols.values()]) {
            for (const p of propertiesCollection) {
                const weight = objectPreview.propertyWeight(p);
                properties.push(this._createVariablesForProperty(p, object).then(p => p.map(v => ({ v, weight }))));
            }
        }
        // Push internal properties
        for (const p of ownProperties.internalProperties || []) {
            if (p.name === '[[StableObjectId]]') {
                continue;
            }
            const weight = objectPreview.internalPropertyWeight(p);
            let variable;
            if (p.name === '[[FunctionLocation]]' &&
                p.value &&
                p.value.subtype === 'internal#location') {
                const loc = p.value.value;
                variable = {
                    name: p.name,
                    value: await this._delegate.renderDebuggerLocation(loc),
                    variablesReference: 0,
                    presentationHint: { visibility: 'internal' },
                };
            }
            else {
                variable = await this._createVariable(p.name, object.wrap(p.name, p.value));
            }
            properties.push([
                { v: Object.assign(Object.assign({}, variable), { presentationHint: { visibility: 'internal' } }), weight },
            ]);
        }
        // Wrap up
        const resolved = objUtils_1.flatten(await Promise.all(properties));
        resolved.sort((a, b) => {
            const aname = a.v.name.includes(' ') ? a.v.name.split(' ')[0] : a.v.name;
            const bname = b.v.name.includes(' ') ? b.v.name.split(' ')[0] : b.v.name;
            if (!isNaN(+aname) && !isNaN(+bname))
                return +aname - +bname;
            const delta = b.weight - a.weight;
            return delta ? delta : aname.localeCompare(bname);
        });
        return resolved.map(p => p.v);
    }
    async _getArrayProperties(object) {
        try {
            const { objectId } = await getArrayProperties_1.getArrayProperties({
                cdp: object.cdp,
                args: [],
                objectId: object.objectId,
                generatePreview: true,
            });
            return this._getObjectProperties(object, objectId);
        }
        catch (e) {
            return [];
        }
    }
    async _getArraySlots(object, params) {
        const start = params && typeof params.start !== 'undefined' ? params.start : -1;
        const count = params && typeof params.count !== 'undefined' ? params.count : -1;
        let objectId;
        try {
            const response = await getArraySlots_1.getArraySlots({
                cdp: object.cdp,
                generatePreview: false,
                args: [start, count],
                objectId: object.objectId,
            });
            objectId = response.objectId;
        }
        catch (e) {
            return [];
        }
        const result = (await this._getObjectProperties(object, objectId)).filter(p => p.name !== '__proto__');
        await this._cdp.Runtime.releaseObject({ objectId });
        return result;
    }
    _createVariableReference(object) {
        const reference = ++VariableStore._lastVariableReference;
        this._referenceToObject.set(reference, object);
        this._objectToReference.set(object.objectId, reference);
        return reference;
    }
    async _createVariablesForProperty(p, owner) {
        const result = [];
        // If the value is simply present, add that
        if ('value' in p) {
            result.push(await this._createVariable(p.name, owner.wrap(p.name, p.value), 'propertyValue'));
        }
        // if it's a getter, auto expand as requested
        if (p.get && p.get.type !== 'undefined') {
            let value;
            if (this.autoExpandGetters) {
                try {
                    value = await invokeGetter_1.invokeGetter({
                        cdp: owner.cdp,
                        objectId: owner.objectId,
                        args: [p.name],
                    });
                }
                catch (_a) {
                    // fall through
                }
            }
            if (value) {
                result.push(await this._createVariable(p.name, owner.wrap(p.name, value), 'propertyValue'));
            }
            else {
                const obj = owner.wrap(p.name, p.get);
                obj.evaluteOnInspect = true;
                result.push(this._createGetter(`${p.name} (get)`, obj, 'propertyValue'));
            }
        }
        // add setter if present
        if (p.set && p.set.type !== 'undefined') {
            result.push(await this._createVariable(`${p.name} (set)`, owner.wrap(p.name, p.set), 'propertyValue'));
        }
        return result;
    }
    async _createVariable(name, value, context) {
        var _a;
        const scopeRef = (_a = value === null || value === void 0 ? void 0 : value.parent) === null || _a === void 0 ? void 0 : _a.scopeRef;
        if (scopeRef) {
            const renames = await this.renameProvider.provideOnStackframe(scopeRef.stackFrame);
            const original = renames.getOriginalName(name, scopeRef.stackFrame.rawPosition);
            if (original) {
                name = original;
            }
        }
        if (!value) {
            return {
                name,
                value: '',
                variablesReference: 0,
            };
        }
        if (objectPreview.isArray(value.o)) {
            return await this._createArrayVariable(name, value, context);
        }
        if (value.objectId && !objectPreview.subtypesWithoutPreview.has(value.o.subtype)) {
            return await this._createObjectVariable(name, value, context);
        }
        return this._createPrimitiveVariable(name, value, context);
    }
    _createGetter(name, value, context) {
        const reference = this._createVariableReference(value);
        return {
            name,
            value: objectPreview.previewRemoteObject(value.o, context),
            evaluateName: value.accessor,
            type: value.o.type,
            variablesReference: reference,
        };
    }
    _createPrimitiveVariable(name, value, context) {
        return {
            name,
            value: objectPreview.previewRemoteObject(value.o, context),
            evaluateName: value.accessor,
            type: value.o.type,
            variablesReference: 0,
        };
    }
    async _createObjectVariable(name, value, context) {
        const variablesReference = this._createVariableReference(value);
        const object = value.o;
        return {
            name,
            value: await this._generateVariableValueDescription(name, value, object, context),
            evaluateName: value.accessor,
            type: object.subtype || object.type,
            variablesReference,
        };
    }
    async _generateVariableValueDescription(name, value, object, context) {
        const defaultValueDescription = (name === '__proto__' && object.description) ||
            objectPreview.previewRemoteObject(object, context);
        if (!this.customDescriptionGenerator) {
            return defaultValueDescription;
        }
        const { result, errorDescription } = await this.evaluateCodeForObject(object, ['defaultValue'], this.customDescriptionGenerator, [defaultValueDescription], 
        /*catchAndReturnErrors*/ true);
        return (result === null || result === void 0 ? void 0 : result.value) ? '' + result.value
            : localize('error.customValueDescriptionGeneratorFailed', "{0} (couldn't describe: {1})", defaultValueDescription, errorDescription);
    }
    async evaluateCodeForObject(object, parameterNames, codeToEvaluate, argumentsToEvaluateWith, catchAndReturnErrors) {
        try {
            const customValueDescription = await this._cdp.Runtime.callFunctionOn({
                objectId: object.objectId,
                functionDeclaration: this.extractFunctionFromCustomDescriptionGenerator(parameterNames, codeToEvaluate, catchAndReturnErrors),
                arguments: argumentsToEvaluateWith.map(arg => this._toCallArgument(arg)),
            });
            if (customValueDescription) {
                if (customValueDescription.exceptionDetails === undefined) {
                    return { result: customValueDescription.result };
                }
                else if (customValueDescription && customValueDescription.result.description) {
                    return { errorDescription: customValueDescription.result.description };
                }
            }
            return { errorDescription: localize('error.unknown', 'Unknown error') };
        }
        catch (e) {
            return { errorDescription: e.stack || e.message || String(e) };
        }
    }
    extractFunctionFromCustomDescriptionGenerator(parameterNames, generatorDefinition, catchAndReturnErrors) {
        const code = sourceCodeManipulations_1.statementsToFunction(parameterNames, sourceCodeManipulations_1.parseSource(generatorDefinition), catchAndReturnErrors);
        return astring_1.generate(code);
    }
    async _createArrayVariable(name, value, context) {
        const object = value.o;
        const variablesReference = this._createVariableReference(value);
        const match = String(object.description).match(/\(([0-9]+)\)/);
        const arrayLength = match ? +match[1] : 0;
        // For small arrays (less than 100 items), pretend we don't have indexex properties.
        return {
            name,
            value: await this._generateVariableValueDescription(name, value, object, context),
            type: object.className || object.subtype || object.type,
            variablesReference,
            evaluateName: value.accessor,
            indexedVariables: arrayLength > 100 ? arrayLength : undefined,
            namedVariables: arrayLength > 100 ? 1 : undefined,
        };
    }
    _toCallArgument(value) {
        if (typeof value === 'string')
            return { value };
        const object = value;
        if (object.objectId)
            return { objectId: object.objectId };
        if (object.unserializableValue)
            return { unserializableValue: object.unserializableValue };
        return { value: object.value };
    }
}
exports.VariableStore = VariableStore;
VariableStore._lastVariableReference = 0;
function errorFromException(details) {
    const message = (details.exception && objectPreview.previewException(details.exception).title) || details.text;
    return errors.createUserError(message);
}
//# sourceMappingURL=variables.js.map
//# sourceMappingURL=variables.js.map
