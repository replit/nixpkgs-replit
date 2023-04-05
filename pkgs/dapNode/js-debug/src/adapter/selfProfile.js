"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfProfile = void 0;
const inspector_1 = require("inspector");
const fs_1 = require("fs");
/**
 * Small class used to profile the extension itself. Used for collecting
 * information in the VS error reporter.
 */
class SelfProfile {
    constructor(file) {
        this.file = file;
        this.session = new inspector_1.Session();
        this.session.connect();
    }
    /**
     * Starts the profile.
     */
    async start() {
        try {
            await this.post('Profiler.enable');
        }
        catch (_a) {
            // already enabled
        }
        await this.post('Profiler.start');
    }
    /**
     * Stop the profile.
     */
    async stop() {
        const { profile } = await this.post('Profiler.stop');
        await fs_1.promises.writeFile(this.file, JSON.stringify(profile));
    }
    dispose() {
        this.session.disconnect();
    }
    post(method, params) {
        return new Promise((resolve, reject) => this.session.post(method, params, (err, result) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(result);
            }
        }));
    }
}
exports.SelfProfile = SelfProfile;
//# sourceMappingURL=selfProfile.js.map
//# sourceMappingURL=selfProfile.js.map
