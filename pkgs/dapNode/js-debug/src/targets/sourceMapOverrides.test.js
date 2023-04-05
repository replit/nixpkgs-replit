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
const chai_1 = require("chai");
const path = __importStar(require("path"));
const logger_1 = require("../common/logging/logger");
const configuration_1 = require("../configuration");
const sourceMapOverrides_1 = require("./sourceMapOverrides");
describe('SourceMapOverrides', () => {
    describe('functionality', () => {
        it('replaces simple paths', () => {
            const r = new sourceMapOverrides_1.SourceMapOverrides({ '/a/*': '/b/*' }, logger_1.Logger.null);
            chai_1.expect(r.apply('/a/foo/bar')).to.equal('/b/foo/bar');
            chai_1.expect(r.apply('/q/foo/bar')).to.equal('/q/foo/bar');
        });
        it('replaces paths without groups on the right', () => {
            const r = new sourceMapOverrides_1.SourceMapOverrides({ '/a/*': '/b' }, logger_1.Logger.null);
            chai_1.expect(r.apply('/a/foo/bar')).to.equal('/b');
        });
        it('replaces paths without groups on the left or right', () => {
            const r = new sourceMapOverrides_1.SourceMapOverrides({ '/a': '/b' }, logger_1.Logger.null);
            chai_1.expect(r.apply('/a/foo/bar')).to.equal('/b/foo/bar');
            chai_1.expect(r.apply('/abbbbb')).to.equal('/abbbbb');
            chai_1.expect(r.apply('/a')).to.equal('/b');
        });
        it('handles non-capturing groups', () => {
            const r = new sourceMapOverrides_1.SourceMapOverrides({ '/a/?:*/*': '/b/*' }, logger_1.Logger.null);
            chai_1.expect(r.apply('/a/foo/bar')).to.equal('/b/bar');
        });
        it('applies longer replacements first', () => {
            const r = new sourceMapOverrides_1.SourceMapOverrides({ '/a/*': '/c', '/a/foo': '/b' }, logger_1.Logger.null);
            chai_1.expect(r.apply('/a/foo')).to.equal('/b');
        });
        it('preserves $ in right hand side', () => {
            const r = new sourceMapOverrides_1.SourceMapOverrides({ '/a/*': '/c/$/$1/$$/*' }, logger_1.Logger.null);
            chai_1.expect(r.apply('/a/foo')).to.equal('/c/$/$1/$$/foo');
        });
        it('allows raw regex', () => {
            const r = new sourceMapOverrides_1.SourceMapOverrides({ '/a/([^/]+)/(.+)': '/c/dir-$1/$2' }, logger_1.Logger.null);
            chai_1.expect(r.apply('/a/b/foo')).to.equal('/c/dir-b/foo');
        });
        it('normalizes slashes in returned paths (issue #401)', () => {
            const r = new sourceMapOverrides_1.SourceMapOverrides({
                'webpack:/*': '${webRoot}/*',
                '/./*': '${webRoot}/*',
                '/src/*': '${webRoot}/*',
                '/*': '*',
                '/./~/*': '${webRoot}/node_modules/*',
            }, logger_1.Logger.null);
            chai_1.expect(r.apply('webpack:///src/app/app.component.ts')).to.equal(path.join('${webRoot}/src/app/app.component.ts'));
        });
        it('handles meteor paths (issue #491)', () => {
            const r = new sourceMapOverrides_1.SourceMapOverrides({
                'meteor:/💻app/*': '${webRoot}/*',
                'meteor://💻app/*': '${webRoot}/*',
                '~/dev/booker-meteor/meteor:/💻app/*': '${webRoot}/*',
                'packages/meteor:/💻app/*': '${workspaceFolder}/.meteor/packages/*',
            }, logger_1.Logger.null);
            chai_1.expect(r.apply('meteor://💻app/packages/base64/base64.js')).to.equal(path.join('${webRoot}/packages/base64/base64.js'));
        });
        it('normalizes backslashes given in patterns (#604)', () => {
            const r = new sourceMapOverrides_1.SourceMapOverrides({
                'H:\\cv-measure\\measure-tools/test-app/measure-tools/src/*': 'H:\\cv-measure\\measure-tools/measure-tools/src/*',
            }, logger_1.Logger.null);
            chai_1.expect(r.apply('H:/cv-measure/measure-tools/test-app/measure-tools/src/api/Measurement.ts')).to.equal(path.win32.join('H:/cv-measure/measure-tools/measure-tools/src/api/Measurement.ts'));
        });
        it('handles single file overrides', () => {
            const r = new sourceMapOverrides_1.SourceMapOverrides({ '/foo/bar.js': '${webRoot}/baz.js' }, logger_1.Logger.null);
            chai_1.expect(r.apply('/foo/bar.js')).to.equal(path.join('${webRoot}/baz.js'));
        });
    });
    describe('defaults', () => {
        let r;
        before(() => (r = new sourceMapOverrides_1.SourceMapOverrides(configuration_1.baseDefaults.sourceMapPathOverrides, logger_1.Logger.null)));
        it('does not touch already valid paths', () => {
            chai_1.expect(r.apply('https://contoso.com/foo.ts')).to.equal('https://contoso.com/foo.ts');
            chai_1.expect(r.apply('file:///dev/foo.ts')).to.equal('file:///dev/foo.ts');
        });
        it('resolves webpack paths', () => {
            chai_1.expect(r.apply('webpack:///src/index.ts')).to.equal(path.join('${workspaceFolder}/src/index.ts'));
        });
        it('replaces webpack namespaces', () => {
            chai_1.expect(r.apply('webpack://lib/src/index.ts')).to.equal(path.join('${workspaceFolder}/src/index.ts'));
        });
        it('maps an absolute path on windows', () => {
            chai_1.expect(r.apply('webpack:///c:/users/connor/hello.ts')).to.equal('c:\\users\\connor\\hello.ts');
        });
        it('maps an absolute path on unix', () => {
            chai_1.expect(r.apply('webpack:////users/connor/hello.ts')).to.equal('/users/connor/hello.ts');
        });
    });
});
//# sourceMappingURL=sourceMapOverrides.test.js.map
//# sourceMappingURL=sourceMapOverrides.test.js.map
