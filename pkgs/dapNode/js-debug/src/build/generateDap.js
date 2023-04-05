"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const got_1 = __importDefault(require("got"));
const dapCustom_1 = __importDefault(require("./dapCustom"));
const generateUtils_1 = require("./generateUtils");
/* eslint-disable @typescript-eslint/no-non-null-assertion */
function toTitleCase(s) {
    return s[0].toUpperCase() + s.substr(1);
}
function hasRef(definition) {
    return typeof definition === 'object' && !!definition.$ref;
}
async function generate() {
    var _a, _b;
    const { body: standard } = await got_1.default('https://raw.githubusercontent.com/microsoft/debug-adapter-protocol/gh-pages/debugAdapterProtocol.json', { responseType: 'json' });
    const result = [];
    result.push(generateUtils_1.autoGeneratedFileHeader('generate-dap-api.js'));
    result.push(`import * as E from './error';`);
    result.push(``);
    result.push(`export namespace Dap {`);
    result.push(`export type Error = E.Error;`);
    result.push(`export type Message = E.Message;`);
    result.push(`export type integer = number;`);
    result.push(``);
    function appendText(text) {
        if (!text)
            return;
        result.push(`/**`);
        for (const line of text.split('\n'))
            result.push(` * ${line}`);
        result.push(` */`);
    }
    function createSeparator() {
        let first = true;
        return function () {
            if (!first)
                result.push(``);
            first = false;
        };
    }
    const defs = Object.assign(Object.assign({}, standard.definitions), dapCustom_1.default.definitions);
    function definition(name) {
        return name.substring('#/definitions/'.length);
    }
    const types = [];
    const typesSet = new Set();
    function generateType(prop) {
        const valueEnum = prop._enum;
        if (valueEnum) {
            return `${valueEnum.map(value => `'${value}'`).join(' | ')}`;
        }
        if (prop['$ref']) {
            const def = definition(prop['$ref']);
            if (!typesSet.has(def)) {
                types.push(def);
                typesSet.add(def);
            }
            return `${def}`;
        }
        if (Array.isArray(prop.type)) {
            return `${prop.type.map(type => generateType({ type })).join(' | ')}`;
        }
        if (prop.type === 'array') {
            const subtype = prop.items ? generateType(prop.items) : 'any';
            return `${subtype}[]`;
        }
        if (prop.oneOf) {
            return `${prop.oneOf.map(generateType).join(' | ')}`;
        }
        if (!prop.type) {
            throw new Error(`Expected prop type in ${JSON.stringify(prop)}`);
        }
        return prop.type;
    }
    function appendProps(props, required) {
        const requiredSet = new Set(required || []);
        const propSeparator = createSeparator();
        for (const name in props) {
            const prop = props[name];
            propSeparator();
            appendText(prop.description);
            const generatedType = generateType(prop);
            result.push(`${name}${requiredSet.has(name) ? '' : '?'}: ${generatedType};`);
        }
    }
    function getExtends(def) {
        const refs = def
            .allOf.filter(hasRef)
            .map(x => definition(x.$ref))
            .join(', ');
        return 'extends ' + refs;
    }
    const stubs = [];
    const interfaceSeparator = createSeparator();
    interfaceSeparator();
    const apiSeparator = createSeparator();
    // ============================ API ==============================
    result.push(`export interface Api {`);
    for (const name in defs) {
        const def = defs[name];
        if (!def.allOf) {
            continue;
        }
        const ref = def.allOf.find(hasRef);
        const desc = def.allOf.find(parent => !hasRef(parent));
        if (!ref || !desc) {
            continue;
        }
        if (ref.$ref === '#/definitions/Event') {
            apiSeparator();
            appendText(desc.description);
            result.push(`${desc.properties.event.enum[0]}(params: ${name}Params): void;`);
            stubs.push({
                type: 'event',
                name: `${name}Params`,
                value: ((_a = desc.properties) === null || _a === void 0 ? void 0 : _a.body) || { properties: {} },
            });
        }
        if (ref['$ref'] === '#/definitions/Request') {
            const short = desc.properties.command.enum[0];
            const title = toTitleCase(String(short));
            apiSeparator();
            appendText(desc.description);
            result.push(`on(request: '${short}', handler: (params: ${title}Params) => Promise<${title}Result | Error>): () => void;`);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const args = ((_b = desc.properties) === null || _b === void 0 ? void 0 : _b.arguments) ? desc.properties.arguments.$ref : '#/definitions/';
            stubs.push({
                type: 'params',
                name: `${title}Params`,
                value: defs[definition(args)] || { properties: {} },
            });
            stubs.push({
                type: 'result',
                name: `${title}Result`,
                value: defs[`${name.substring(0, name.length - 'Request'.length)}Response`],
            });
            appendText(desc.description);
            result.push(`${short}Request(params: ${title}Params): Promise<${title}Result>;`);
        }
    }
    result.push(`}`);
    // ============================ TEST API ==============================
    interfaceSeparator();
    result.push(`export interface TestApi {`);
    for (const name in defs) {
        const def = defs[name];
        if (!def.allOf) {
            continue;
        }
        const ref = def.allOf.find(hasRef);
        const desc = def.allOf.find(parent => !hasRef(parent));
        if (!ref || !desc) {
            continue;
        }
        if (ref['$ref'] === '#/definitions/Event') {
            apiSeparator();
            appendText(desc.description);
            result.push(`on(request: '${desc.properties.event.enum[0]}', handler: (params: ${name}Params) => void): void;`);
            result.push(`off(request: '${desc.properties.event.enum[0]}', handler: (params: ${name}Params) => void): void;`);
            result.push(`once(request: '${desc.properties.event.enum[0]}', filter?: (event: ${name}Params) => boolean): Promise<${name}Params>;`);
        }
        if (ref['$ref'] === '#/definitions/Request') {
            const short = desc.properties.command.enum[0];
            const title = toTitleCase(String(short));
            apiSeparator();
            appendText(desc.description);
            result.push(`${short}(params: ${title}Params): Promise<${title}Result>;`);
        }
    }
    result.push(`}`);
    // ============================ TYPES ==============================
    stubs.sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const type of stubs) {
        interfaceSeparator();
        result.push(`export interface ${type.name} {`);
        if (type.type === 'result') {
            const desc = type.value.allOf.find(parent => !parent['$ref']);
            type.value = desc.properties ? desc.properties.body : { properties: {} };
            while (type.value['$ref'])
                type.value = defs[definition(type.value['$ref'])];
        }
        appendProps(type.value.properties, type.value.required);
        result.push(`}`);
    }
    while (types.length) {
        const type = types.pop();
        const def = defs[type];
        interfaceSeparator();
        appendText(def.description);
        if (def.type && def.type !== 'object') {
            result.push(`export type ${type} = ${def.type};`);
        }
        else {
            result.push(`export interface ${type} ${def.allOf ? getExtends(def) : ''} {`);
            if (def.allOf) {
                // def extends some other interface(s)
                const ownDescription = def.allOf.find(parent => !hasRef(parent));
                appendProps(ownDescription.properties, ownDescription.required);
            }
            else {
                appendProps(def.properties, def.required);
            }
            result.push(`}`);
        }
    }
    result.push(`}`);
    result.push(``);
    result.push(`export default Dap;`);
    result.push(``);
    generateUtils_1.writeCodeToFile(result.join('\n'), 'src/dap/api.d.ts');
    function isRequest(definition) {
        const ref = (definition.allOf || []).find(hasRef);
        return (ref === null || ref === void 0 ? void 0 : ref.$ref) === '#/definitions/Request';
    }
    function generateTelemetryClassifications(definitions) {
        const definitionNames = Object.keys(defs);
        const requestNames = definitionNames.filter(name => isRequest(definitions[name]));
        const propertiesClassifications = requestNames.map(requestName => {
            const noPostfixAndLowercase = requestName.replace(/Request$/, '').toLowerCase();
            return `"${noPostfixAndLowercase}": { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth' },
      "!${noPostfixAndLowercase}.errors": { classification: 'CallstackOrException'; purpose: 'PerformanceAndHealth' },`;
        });
        const interfaceCode = `${generateUtils_1.autoGeneratedFileHeader('generate-cdp-api.js')}
    interface IDAPOperationClassification {
      ${propertiesClassifications.join('\n')}
    }
    `;
        generateUtils_1.writeCodeToFile(interfaceCode, 'src/dap/telemetryClassification.d.ts', { printWidth: 150 });
    }
    generateTelemetryClassifications(defs);
}
generate().catch(console.error);
//# sourceMappingURL=generateDap.js.map
//# sourceMappingURL=generateDap.js.map