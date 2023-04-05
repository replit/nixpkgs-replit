"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
const chai_1 = require("chai");
const pathUtils_1 = require("../../common/pathUtils");
describe('pathUtils', () => {
    describe('forceForwardSlashes', () => {
        it('works for c:/... cases', () => {
            chai_1.expect(pathUtils_1.forceForwardSlashes('C:\\foo\\bar')).to.equal('C:/foo/bar');
            chai_1.expect(pathUtils_1.forceForwardSlashes('C:\\')).to.equal('C:/');
            chai_1.expect(pathUtils_1.forceForwardSlashes('C:/foo\\bar')).to.equal('C:/foo/bar');
        });
        it('works for relative paths', () => {
            chai_1.expect(pathUtils_1.forceForwardSlashes('foo\\bar')).to.equal('foo/bar');
            chai_1.expect(pathUtils_1.forceForwardSlashes('foo\\bar/baz')).to.equal('foo/bar/baz');
        });
        it('fixes escaped forward slashes', () => {
            chai_1.expect(pathUtils_1.forceForwardSlashes('foo\\/bar')).to.equal('foo/bar');
        });
    });
    describe('fixDriveLetterAndSlashes', () => {
        it('works for c:/... cases', () => {
            chai_1.expect(pathUtils_1.fixDriveLetterAndSlashes('C:/path/stuff')).to.equal('c:\\path\\stuff');
            chai_1.expect(pathUtils_1.fixDriveLetterAndSlashes('c:/path\\stuff')).to.equal('c:\\path\\stuff');
            chai_1.expect(pathUtils_1.fixDriveLetterAndSlashes('C:\\path')).to.equal('c:\\path');
            chai_1.expect(pathUtils_1.fixDriveLetterAndSlashes('C:\\')).to.equal('c:\\');
        });
        it('works for file:/// cases', () => {
            chai_1.expect(pathUtils_1.fixDriveLetterAndSlashes('file:///C:/path/stuff')).to.equal('file:///c:\\path\\stuff');
            chai_1.expect(pathUtils_1.fixDriveLetterAndSlashes('file:///c:/path\\stuff')).to.equal('file:///c:\\path\\stuff');
            chai_1.expect(pathUtils_1.fixDriveLetterAndSlashes('file:///C:\\path')).to.equal('file:///c:\\path');
            chai_1.expect(pathUtils_1.fixDriveLetterAndSlashes('file:///C:\\')).to.equal('file:///c:\\');
        });
        it('does not impact posix cases', () => {
            chai_1.expect(pathUtils_1.fixDriveLetterAndSlashes('file:///a/b')).to.equal('file:///a/b');
            chai_1.expect(pathUtils_1.fixDriveLetterAndSlashes('/a/b')).to.equal('/a/b');
        });
    });
});
//# sourceMappingURL=pathUtils.test.js.map
//# sourceMappingURL=pathUtils.test.js.map
