"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const testIntegrationUtils_1 = require("../testIntegrationUtils");
describe('frames', () => {
    testIntegrationUtils_1.itIntegrates('hierarchy', async ({ r }) => {
        r.setArgs(['--site-per-process']);
        const p = await r.launchUrl('frames.html');
        p.load();
        const logTarget = (t, indent) => {
            const s = ' '.repeat(indent);
            p.log(`${s}${t.type()} "${t.name()}" [thread "${t.scriptUrlToUrl('')}"]${t.fileName() ? ' @ ' + t.fileName() : ''}`);
            const children = t.children();
            children.sort((t1, t2) => {
                return t1.name().localeCompare(t2.name());
            });
            children.forEach(child => logTarget(child, indent + 2));
        };
        await new Promise(f => {
            r.onSessionCreated(() => {
                if (r.binder.targetList().length === 11)
                    f();
            });
        });
        r.binder
            .targetList()
            .filter(t => !t.parent())
            .forEach(target => logTarget(target, 0));
        p.assertLog();
    });
});
//# sourceMappingURL=framesTest.js.map
//# sourceMappingURL=framesTest.js.map
