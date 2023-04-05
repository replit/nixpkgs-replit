"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUiComponents = void 0;
const ioc_extras_1 = require("../ioc-extras");
const cascadeTerminateTracker_1 = require("./cascadeTerminateTracker");
const configuration_1 = require("./configuration");
const debugLinkUI_1 = require("./debugLinkUI");
const debugSessionTracker_1 = require("./debugSessionTracker");
const diagnosticsUI_1 = require("./diagnosticsUI");
const disableSourceMapUI_1 = require("./disableSourceMapUI");
const edgeDevToolOpener_1 = require("./edgeDevToolOpener");
const linkedBreakpointLocation_1 = require("./linkedBreakpointLocation");
const linkedBreakpointLocationUI_1 = require("./linkedBreakpointLocationUI");
const longPredictionUI_1 = require("./longPredictionUI");
const portAttributesProvider_1 = require("./portAttributesProvider");
const breakpointTerminationCondition_1 = require("./profiling/breakpointTerminationCondition");
const durationTerminationCondition_1 = require("./profiling/durationTerminationCondition");
const manualTerminationCondition_1 = require("./profiling/manualTerminationCondition");
const terminationCondition_1 = require("./profiling/terminationCondition");
const uiProfileManager_1 = require("./profiling/uiProfileManager");
const startDebuggingAndStopOnEntry_1 = require("./startDebuggingAndStopOnEntry");
const terminalLinkHandler_1 = require("./terminalLinkHandler");
exports.registerUiComponents = (container) => {
    configuration_1.allConfigurationResolvers.forEach(cls => {
        container
            .bind(cls)
            .toSelf()
            .inSingletonScope();
        container.bind(configuration_1.IDebugConfigurationResolver).to(cls);
    });
    configuration_1.allConfigurationProviders.forEach(cls => container.bind(configuration_1.IDebugConfigurationProvider).to(cls).inSingletonScope());
    container.bind(ioc_extras_1.IExtensionContribution).to(longPredictionUI_1.LongPredictionUI).inSingletonScope();
    container.bind(ioc_extras_1.IExtensionContribution).to(debugLinkUI_1.DebugLinkUi).inSingletonScope();
    container.bind(ioc_extras_1.IExtensionContribution).to(cascadeTerminateTracker_1.CascadeTerminationTracker).inSingletonScope();
    container.bind(ioc_extras_1.IExtensionContribution).to(disableSourceMapUI_1.DisableSourceMapUI).inSingletonScope();
    container.bind(ioc_extras_1.IExtensionContribution).to(diagnosticsUI_1.DiagnosticsUI).inSingletonScope();
    container.bind(ioc_extras_1.IExtensionContribution).to(startDebuggingAndStopOnEntry_1.StartDebugingAndStopOnEntry).inSingletonScope();
    container.bind(ioc_extras_1.IExtensionContribution).to(portAttributesProvider_1.JsDebugPortAttributesProvider).inSingletonScope();
    container.bind(ioc_extras_1.IExtensionContribution).to(edgeDevToolOpener_1.EdgeDevToolOpener).inSingletonScope();
    container.bind(linkedBreakpointLocation_1.ILinkedBreakpointLocation).to(linkedBreakpointLocationUI_1.LinkedBreakpointLocationUI).inSingletonScope();
    container.bind(debugSessionTracker_1.DebugSessionTracker).toSelf().inSingletonScope().onActivation(ioc_extras_1.trackDispose);
    container.bind(uiProfileManager_1.UiProfileManager).toSelf().inSingletonScope().onActivation(ioc_extras_1.trackDispose);
    container.bind(terminalLinkHandler_1.TerminalLinkHandler).toSelf().inSingletonScope();
    container.bind(disableSourceMapUI_1.DisableSourceMapUI).toSelf().inSingletonScope();
    container
        .bind(terminationCondition_1.ITerminationConditionFactory)
        .to(durationTerminationCondition_1.DurationTerminationConditionFactory)
        .inSingletonScope();
    container
        .bind(terminationCondition_1.ITerminationConditionFactory)
        .to(manualTerminationCondition_1.ManualTerminationConditionFactory)
        .inSingletonScope();
    container
        .bind(terminationCondition_1.ITerminationConditionFactory)
        .to(breakpointTerminationCondition_1.BreakpointTerminationConditionFactory)
        .inSingletonScope();
};
//# sourceMappingURL=ui-ioc.js.map
//# sourceMappingURL=ui-ioc.js.map
