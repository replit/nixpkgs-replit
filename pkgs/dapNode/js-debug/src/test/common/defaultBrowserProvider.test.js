"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const defaultBrowserProvider_1 = require("../../common/defaultBrowserProvider");
const sinon_1 = require("sinon");
const chai_1 = require("chai");
describe('defaultBrowserProvider', () => {
    // only test win32, as linux/osx are provided by an npm module
    describe('win32', () => {
        const cases = [
            {
                output: '\r\nHKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice\r\n    ProgId    REG_SZ    AppXq0fevzme2pys62n3e0fbqa7peapykr8v\r\n\r\n',
                expected: 4 /* OldEdge */,
            },
            {
                output: '\r\nHKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice\r\n    ProgId    REG_SZ    MSEdgeDHTML\r\n\r\n',
                expected: 3 /* Edge */,
            },
            {
                output: '\r\nHKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice\r\n    ProgId    REG_SZ    ChromeHTML\r\n\r\n',
                expected: 0 /* Chrome */,
            },
            {
                output: '\r\nHKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice\r\n    ProgId    REG_SZ    IE.HTTP\r\n\r\n',
                expected: 5 /* IE */,
            },
            {
                output: '\r\nHKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice\r\n    ProgId    REG_SZ    FirefoxURL\r\n\r\n',
                expected: 2 /* Firefox */,
            },
            {
                output: '\r\nHKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice\r\n    ProgId    REG_SZ    Potato\r\n\r\n',
                expected: undefined,
            },
        ];
        for (const { output, expected } of cases) {
            it(`gets browser ${expected}`, async () => {
                const execa = sinon_1.stub().resolves({ stdout: output });
                const provider = new defaultBrowserProvider_1.DefaultBrowserProvider(execa, 'win32');
                chai_1.expect(await provider.lookup()).to.equal(expected);
            });
        }
    });
});
//# sourceMappingURL=defaultBrowserProvider.test.js.map
//# sourceMappingURL=defaultBrowserProvider.test.js.map
