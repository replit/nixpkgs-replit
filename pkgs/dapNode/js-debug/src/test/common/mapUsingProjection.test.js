"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const mapUsingProjection_1 = require("../../common/datastructure/mapUsingProjection");
describe('mapUsingProjection', () => {
    it('gets values', () => {
        const m = new mapUsingProjection_1.MapUsingProjection(k => k.toLowerCase());
        m.set('bar', 1);
        chai_1.expect(m.get('foo')).to.be.undefined;
        chai_1.expect(m.get('bar')).to.equal(1);
        chai_1.expect(m.get('bAr')).to.equal(1);
    });
    it('sets values', () => {
        const m = new mapUsingProjection_1.MapUsingProjection(k => k.toLowerCase());
        m.set('bar', 1);
        chai_1.expect(m.get('bar')).to.equal(1);
        m.set('BAR', 2);
        chai_1.expect(m.get('bar')).to.equal(2);
    });
    it('deletes values', () => {
        const m = new mapUsingProjection_1.MapUsingProjection(k => k.toLowerCase());
        m.set('bar', 1);
        m.delete('bAr');
        chai_1.expect(m.get('bar')).to.be.undefined;
    });
    it('gets keys', () => {
        const m = new mapUsingProjection_1.MapUsingProjection(k => k.toLowerCase());
        m.set('FOO', 1);
        m.set('bar', 1);
        chai_1.expect([...m.keys()].sort()).to.deep.equal(['FOO', 'bar']);
    });
    it('gets values', () => {
        const m = new mapUsingProjection_1.MapUsingProjection(k => k.toLowerCase());
        m.set('FOO', 1);
        m.set('bar', 2);
        chai_1.expect([...m.values()].sort()).to.deep.equal([1, 2]);
    });
});
//# sourceMappingURL=mapUsingProjection.test.js.map
//# sourceMappingURL=mapUsingProjection.test.js.map
