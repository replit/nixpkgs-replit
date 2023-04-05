"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const logger_1 = require("../../common/logging/logger");
const nullTelemetryReporter_1 = require("../../telemetry/nullTelemetryReporter");
const unhandledErrorReporter_1 = require("../../telemetry/unhandledErrorReporter");
const watchdogSpawn_1 = require("./watchdogSpawn");
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const info = JSON.parse(process.env.NODE_INSPECTOR_INFO);
const logger = new logger_1.Logger();
logger.setup({
    level: 1 /* Info */,
    sinks: [
    /*new FileLogSink(require('path').join(require('os').homedir(), 'watchdog.txt'))*/
    ],
});
unhandledErrorReporter_1.installUnhandledErrorReporter(logger, new nullTelemetryReporter_1.NullTelemetryReporter());
(async () => {
    process.on('exit', () => {
        logger.info("runtime" /* Runtime */, 'Process exiting');
        logger.dispose();
        if (info.pid && !info.dynamicAttach && (!wd || wd.isTargetAlive)) {
            process.kill(Number(info.pid));
        }
    });
    const wd = await watchdogSpawn_1.WatchDog.attach(info);
    wd.onEnd(() => process.exit());
})();
//# sourceMappingURL=watchdog.js.map
//# sourceMappingURL=watchdog.js.map
