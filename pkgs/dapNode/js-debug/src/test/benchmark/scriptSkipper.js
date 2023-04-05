"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const implementation_1 = require("../../adapter/scriptSkipper/implementation");
const connection_1 = __importDefault(require("../../cdp/connection"));
const nullTransport_1 = require("../../cdp/nullTransport");
const logger_1 = require("../../common/logging/logger");
const nullTelemetryReporter_1 = require("../../telemetry/nullTelemetryReporter");
const skipper = new implementation_1.ScriptSkipper({ skipFiles: ['<node_internals>/**', '/foo/*.js'] }, logger_1.Logger.null, new connection_1.default(new nullTransport_1.NullTransport(), logger_1.Logger.null, new nullTelemetryReporter_1.NullTelemetryReporter()).createSession(''), {
    type: () => 'browser',
    id: () => 'a',
    parent: () => undefined,
});
const notSkipped = {
    url: 'file:///not-skipped.js',
    absolutePath: '/not-skipped.js',
    scriptIds: () => ['41'],
};
const isSkipped = {
    url: 'file:///foo/bar.js',
    absolutePath: '/foo/bar.js',
    scriptIds: () => ['42'],
};
function default_1(api) {
    api.bench('initializeSkippingValueForSource not skipped', () => skipper.initializeSkippingValueForSource(notSkipped));
    api.bench('initializeSkippingValueForSource with skipped', () => skipper.initializeSkippingValueForSource(isSkipped));
}
exports.default = default_1;
//# sourceMappingURL=scriptSkipper.js.map
//# sourceMappingURL=scriptSkipper.js.map
