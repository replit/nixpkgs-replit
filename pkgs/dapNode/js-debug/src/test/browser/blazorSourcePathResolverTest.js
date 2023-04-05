"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const fsUtils_1 = require("../../common/fsUtils");
const logger_1 = require("../../common/logging/logger");
const urlUtils_1 = require("../../common/urlUtils");
const configuration_1 = require("../../configuration");
const blazorSourcePathResolver_1 = require("../../targets/browser/blazorSourcePathResolver");
const test_1 = require("../test");
const browserPathResolverTest_1 = require("./browserPathResolverTest");
function createBlazorSourcePathResolver(remoteFilePrefix) {
    return new blazorSourcePathResolver_1.BlazorSourcePathResolver(browserPathResolverTest_1.testVueMapper, new fsUtils_1.LocalFsUtils(fs_1.promises), {
        pathMapping: { '/': path_1.default.join(test_1.testFixturesDir, 'web') },
        clientID: 'vscode',
        baseUrl: 'http://localhost:1234/',
        sourceMapOverrides: configuration_1.defaultSourceMapPathOverrides(path_1.default.join(test_1.testFixturesDir, 'web')),
        localRoot: null,
        remoteRoot: null,
        resolveSourceMapLocations: null,
        remoteFilePrefix,
    }, logger_1.Logger.null);
}
const isWindows = process.platform === 'win32';
const platformRoot = isWindows ? 'C:' : '/c';
describe('BlazorSourcePathResolver.absolutePathToUrlRegexp', () => {
    it('generates the correct regexp in local scenarios', async () => {
        const sourcePath = path_1.default.join(platformRoot, 'Users', 'digeff', 'source', 'repos', 'MyBlazorApp', 'MyBlazorApp', 'Pages', 'Counter.razor');
        const regexp = await createBlazorSourcePathResolver(undefined).absolutePathToUrlRegexp(sourcePath);
        if (urlUtils_1.getCaseSensitivePaths()) {
            chai_1.expect(regexp).to.equal('file:\\/\\/\\/c\\/Users\\/digeff\\/source\\/repos\\/MyBlazorApp\\/MyBlazorApp\\/Pages\\/Counter\\.razor' +
                '|\\/c\\/Users\\/digeff\\/source\\/repos\\/MyBlazorApp\\/MyBlazorApp\\/Pages\\/Counter\\.razor');
        }
        else {
            // This regexp was generated from running the real scenario, verifying that the breakpoint with this regexp works, and then copying it here
            chai_1.expect(regexp).to.equal('[fF][iI][lL][eE]:\\/\\/\\/[cC]:\\/[uU][sS][eE][rR][sS]\\/[dD][iI][gG][eE][fF][fF]\\/[sS][oO][uU][rR][cC][eE]\\/' +
                '[rR][eE][pP][oO][sS]\\/[mM][yY][bB][lL][aA][zZ][oO][rR][aA][pP][pP]\\/[mM][yY][bB][lL][aA][zZ][oO][rR][aA][pP][pP]\\/' +
                '[pP][aA][gG][eE][sS]\\/[cC][oO][uU][nN][tT][eE][rR]\\.[rR][aA][zZ][oO][rR]|[cC]:\\\\[uU][sS][eE][rR][sS]\\\\[dD][iI][gG][eE][fF][fF]\\\\' +
                '[sS][oO][uU][rR][cC][eE]\\\\[rR][eE][pP][oO][sS]\\\\[mM][yY][bB][lL][aA][zZ][oO][rR][aA][pP][pP]\\\\[mM][yY][bB][lL][aA][zZ][oO][rR][aA][pP][pP]\\\\' +
                '[pP][aA][gG][eE][sS]\\\\[cC][oO][uU][nN][tT][eE][rR]\\.[rR][aA][zZ][oO][rR]');
        }
    });
    if (isWindows) {
        // At the moment the Blazor remote scenario is only supported on VS/Windows
        it('generates the correct regexp in codespace scenarios', async () => {
            const remoteFilePrefix = path_1.default.join(platformRoot, 'Users', 'digeff', 'AppData', 'Local', 'Temp', '2689D069D40B1EFF4B570B2DB12506073980', '5~~');
            const sourcePath = `${remoteFilePrefix}\\C$\\workspace\\NewBlazorWASM\\NewBlazorWASM\\Pages\\Counter.razor`;
            const regexp = await createBlazorSourcePathResolver(remoteFilePrefix).absolutePathToUrlRegexp(sourcePath);
            // This regexp was generated from running the real scenario, verifying that the breakpoint with this regexp works, and then copying it here
            chai_1.expect(regexp).to.equal('dotnet://.*\\.dll/[cC]\\/[wW][oO][rR][kK][sS][pP][aA][cC][eE]\\/[nN][eE][wW][bB][lL][aA][zZ][oO][rR][wW][aA][sS][mM]\\/' +
                '[nN][eE][wW][bB][lL][aA][zZ][oO][rR][wW][aA][sS][mM]\\/[pP][aA][gG][eE][sS]\\/[cC][oO][uU][nN][tT][eE][rR]\\.[rR][aA][zZ][oO][rR]');
        });
    }
});
//# sourceMappingURL=blazorSourcePathResolverTest.js.map
//# sourceMappingURL=blazorSourcePathResolverTest.js.map
