"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const matcha_1 = require("@c4312/matcha");
const fs_1 = require("fs");
require("reflect-metadata");
matcha_1.benchmark({
    reporter: new matcha_1.PrettyReporter(process.stdout),
    middleware: process.argv[2] ? [matcha_1.grepMiddleware(process.argv[2])] : undefined,
    prepare(api) {
        for (const file of fs_1.readdirSync(__dirname).filter(f => f.endsWith('.js') && f !== 'index.js')) {
            api.suite(file, () => require(`./${file}`).default(api));
        }
    },
})
    .then(() => process.exit(0))
    .catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
