"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixInspectFlags = void 0;
/**
 * Removes any --inspect-brk flags from the launch configuration and sets
 * stopOnEntry instead, otherwise we break inside the bootloader.
 */
function fixInspectFlags(config) {
    if (!config.runtimeArgs || config.attachSimplePort) {
        return;
    }
    const resolved = [];
    for (const arg of config.runtimeArgs) {
        if (/^--inspect-brk(=|$)/.test(arg)) {
            config.stopOnEntry = config.stopOnEntry || true;
        }
        else {
            resolved.push(arg);
        }
    }
    config.runtimeArgs = resolved;
}
exports.fixInspectFlags = fixInspectFlags;
//# sourceMappingURL=configurationUtils.js.map
//# sourceMappingURL=configurationUtils.js.map
