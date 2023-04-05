"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const got_1 = __importDefault(require("got"));
const generateUtils_1 = require("./generateUtils");
const jsDebugCustom_1 = __importDefault(require("./jsDebugCustom"));
const nodeCustom_1 = __importDefault(require("./nodeCustom"));
function toTitleCase(s) {
    return s[0].toUpperCase() + s.substr(1);
}
const getDefinition = async (url) => {
    const { body } = await got_1.default(url, { responseType: 'json' });
    return body;
};
async function generate() {
    const jsProtocol = await getDefinition('https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/js_protocol.json');
    const browserProtocol = await getDefinition('https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/browser_protocol.json');
    const compareDomains = (a, b) => a.domain.toUpperCase() < b.domain.toUpperCase() ? -1 : 1;
    const domains = jsProtocol.domains
        .concat(browserProtocol.domains)
        .concat(nodeCustom_1.default.domains)
        .concat(jsDebugCustom_1.default.domains)
        .sort(compareDomains);
    const result = [];
    const interfaceSeparator = createSeparator();
    result.push(generateUtils_1.autoGeneratedFileHeader('generate-cdp-api.js'));
    result.push(`import { IDisposable } from '../common/disposable'; `);
    result.push(``);
    result.push(`export namespace Cdp {`);
    result.push(`export type integer = number;`);
    interfaceSeparator();
    function appendText(text, tags = {}) {
        for (const key of Object.keys(tags)) {
            const value = tags[key];
            if (!value) {
                continue;
            }
            text += `\n@${key}`;
            if (typeof value === 'string') {
                text += ` ${value}`;
            }
        }
        if (!text)
            return;
        result.push('/**');
        for (const line of text.split('\n'))
            result.push(` * ${line}`);
        result.push(' */');
    }
    function createSeparator() {
        let first = true;
        return function () {
            if (!first)
                result.push('');
            first = false;
        };
    }
    function generateType(prop) {
        if (prop.type === 'string' && prop.enum) {
            return `${prop.enum.map(value => `'${value}'`).join(' | ')}`;
        }
        if ('$ref' in prop) {
            return prop.$ref;
        }
        if (prop.type === 'array') {
            const subtype = prop.items ? generateType(prop.items) : 'any';
            return `${subtype}[]`;
        }
        if (prop.type === 'object') {
            return 'any';
        }
        return prop.type;
    }
    function appendProps(props) {
        var _a;
        const separator = createSeparator();
        for (const prop of props) {
            separator();
            appendText((_a = prop.description) !== null && _a !== void 0 ? _a : '', { deprecated: !!prop.deprecated });
            result.push(`${prop.name}${prop.optional ? '?' : ''}: ${generateType(prop)};`);
        }
    }
    function appendDomain(domain) {
        var _a;
        const apiSeparator = createSeparator();
        const commands = domain.commands || [];
        const events = domain.events || [];
        const types = domain.types || [];
        const name = toTitleCase(domain.domain);
        interfaceSeparator();
        appendText(`Methods and events of the '${name}' domain.`);
        result.push(`export interface ${name}Api {`);
        for (const command of commands) {
            apiSeparator();
            appendText(command.description, { deprecated: !!command.deprecated });
            result.push(`${command.name}(params: ${name}.${toTitleCase(command.name)}Params): Promise<${name}.${toTitleCase(command.name)}Result | undefined>;`);
        }
        for (const event of events) {
            apiSeparator();
            appendText(event.description, { deprecated: !!event.deprecated });
            result.push(`on(event: '${event.name}', listener: (event: ${name}.${toTitleCase(event.name)}Event) => void): IDisposable;`);
        }
        result.push(`}`);
        const typesSeparator = createSeparator();
        interfaceSeparator();
        appendText(`Types of the '${name}' domain.`);
        result.push(`export namespace ${name} {`);
        for (const command of commands) {
            typesSeparator();
            appendText(`Parameters of the '${name}.${command.name}' method.`);
            result.push(`export interface ${toTitleCase(command.name)}Params {`);
            appendProps(command.parameters || []);
            result.push(`}`);
            typesSeparator();
            appendText(`Return value of the '${name}.${command.name}' method.`);
            result.push(`export interface ${toTitleCase(command.name)}Result {`);
            appendProps(command.returns || []);
            result.push(`}`);
        }
        for (const event of events) {
            typesSeparator();
            appendText(`Parameters of the '${name}.${event.name}' event.`);
            result.push(`export interface ${toTitleCase(event.name)}Event {`);
            appendProps(event.parameters || []);
            result.push(`}`);
        }
        for (const type of types) {
            typesSeparator();
            appendText((_a = type.description) !== null && _a !== void 0 ? _a : '', { deprecated: !!type.deprecated });
            if (type.type === 'object') {
                result.push(`export interface ${toTitleCase(type.id)} {`);
                if (type.properties)
                    appendProps(type.properties);
                else
                    result.push(`[key: string]: any;`);
                result.push(`}`);
            }
            else {
                result.push(`export type ${toTitleCase(type.id)} = ${generateType(type)};`);
            }
        }
        result.push(`}`);
    }
    function appendPauseResume() {
        result.push(`/**`);
        result.push(` * Pauses events being sent through the aPI.`);
        result.push(` */`);
        result.push(`pause(): void;`);
        result.push(`/**`);
        result.push(` * Resumes previously-paused events`);
        result.push(` */`);
        result.push(`resume(): void;`);
    }
    interfaceSeparator();
    appendText('Protocol API.');
    result.push(`export interface Api {
    readonly session: import('./connection').CDPSession;
  `);
    appendPauseResume();
    domains.forEach(d => {
        result.push(`${d.domain}: ${d.domain}Api;`);
    });
    result.push(`}`);
    domains.forEach(d => appendDomain(d));
    result.push(`}`);
    result.push(``);
    result.push(`export default Cdp;`);
    result.push(``);
    generateUtils_1.writeCodeToFile(result.join('\n'), 'src/cdp/api.d.ts');
    function generateTelemetryClassifications(domains) {
        const propertiesClassifications = domains.map(domain => {
            const eventLines = (domain.events || []).map(event => {
                const qualifiedEventName = `${domain.domain}.${event.name}`.toLowerCase();
                return `"${qualifiedEventName}": { classification: 'SystemMetaData'; purpose: 'PerformanceAndHealth' },
        "!${qualifiedEventName}.errors": { classification: 'CallstackOrException'; purpose: 'PerformanceAndHealth' },`;
            });
            return `
        // Domain: ${domain.domain}
        ${eventLines.join('\n')}`;
        });
        const interfaceCode = `${generateUtils_1.autoGeneratedFileHeader('generate-cdp-api.js')}
    interface ICDPOperationClassification {
      ${propertiesClassifications.join('\n')}
    }
    `;
        generateUtils_1.writeCodeToFile(interfaceCode, 'src/cdp/telemetryClassification.d.ts', { printWidth: 150 });
    }
    generateTelemetryClassifications(domains);
}
generate().catch(console.error);
//# sourceMappingURL=generateCdp.js.map
//# sourceMappingURL=generateCdp.js.map