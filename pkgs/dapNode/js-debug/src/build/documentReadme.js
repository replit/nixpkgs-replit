"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const marked_1 = __importDefault(require("marked"));
const prettier_1 = require("prettier");
const package_json_1 = require("../../package.json");
const generate_contributions_1 = require("./generate-contributions");
const strings_1 = __importDefault(require("./strings"));
(async () => {
    var _a, _b;
    let out = `# Options\n\n`;
    for (const dbg of generate_contributions_1.debuggers) {
        out += `### ${dbg.type}: ${dbg.request}\n\n`;
        out += `<details>`;
        const entries = Object.entries(dbg.configurationAttributes).sort(([a], [b]) => a.localeCompare(b));
        for (const [key, value] of entries) {
            const descriptionKeyRaw = 'markdownDescription' in value ? value.markdownDescription : value.description;
            if (!descriptionKeyRaw) {
                continue;
            }
            const descriptionKey = descriptionKeyRaw.slice(1, -1);
            const description = strings_1.default[descriptionKey].replace(/\n/g, '<br>');
            if (!description) {
                continue;
            }
            const defaultValue = dbg.defaults[key];
            const docDefault = (_b = (_a = value.docDefault) !== null && _a !== void 0 ? _a : JSON.stringify(defaultValue, null, 2)) !== null && _b !== void 0 ? _b : 'undefined';
            out += `<h4>${key}</h4>`;
            out += `${marked_1.default(description)}`;
            out += `<h5>Default value:</h4>`;
            out += `<pre><code>${docDefault}</pre></code>`;
        }
        out += `</details>\n\n`;
    }
    await fs_1.promises.writeFile('OPTIONS.md', prettier_1.format(out, Object.assign({ parser: 'markdown' }, package_json_1.prettier)));
})().catch(console.error);
//# sourceMappingURL=documentReadme.js.map
//# sourceMappingURL=documentReadme.js.map
