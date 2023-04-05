"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.provideLaunchParams = exports.createGlobalContainer = exports.createTopLevelSessionContainer = exports.createTargetContainer = void 0;
const execa_1 = __importDefault(require("execa"));
const fs_1 = require("fs");
const inversify_1 = require("inversify");
require("reflect-metadata");
const vscode_js_debug_browsers_1 = require("vscode-js-debug-browsers");
const breakpointPredictor_1 = require("./adapter/breakpointPredictor");
const breakpoints_1 = require("./adapter/breakpoints");
const conditions_1 = require("./adapter/breakpoints/conditions");
const logPoint_1 = require("./adapter/breakpoints/conditions/logPoint");
const cdpProxy_1 = require("./adapter/cdpProxy");
const completions_1 = require("./adapter/completions");
const console_1 = require("./adapter/console");
const console_2 = require("./adapter/console/console");
const diagnosics_1 = require("./adapter/diagnosics");
const diagnosticToolSuggester_1 = require("./adapter/diagnosticToolSuggester");
const evaluator_1 = require("./adapter/evaluator");
const exceptionPauseService_1 = require("./adapter/exceptionPauseService");
const performance_1 = require("./adapter/performance");
const portLeaseTracker_1 = require("./adapter/portLeaseTracker");
const profileController_1 = require("./adapter/profileController");
const profiling_1 = require("./adapter/profiling");
const basicCpuProfiler_1 = require("./adapter/profiling/basicCpuProfiler");
const resourceProvider_1 = require("./adapter/resourceProvider");
const requestOptionsProvider_1 = require("./adapter/resourceProvider/requestOptionsProvider");
const resourceProviderState_1 = require("./adapter/resourceProvider/resourceProviderState");
const statefulResourceProvider_1 = require("./adapter/resourceProvider/statefulResourceProvider");
const implementation_1 = require("./adapter/scriptSkipper/implementation");
const scriptSkipper_1 = require("./adapter/scriptSkipper/scriptSkipper");
const sources_1 = require("./adapter/sources");
const vueFileMapper_1 = require("./adapter/vueFileMapper");
const connection_1 = require("./cdp/connection");
const observableMap_1 = require("./common/datastructure/observableMap");
const defaultBrowserProvider_1 = require("./common/defaultBrowserProvider");
const fileGlobList_1 = require("./common/fileGlobList");
const fsUtils_1 = require("./common/fsUtils");
const logging_1 = require("./common/logging");
const logger_1 = require("./common/logging/logger");
const mutableLaunchConfig_1 = require("./common/mutableLaunchConfig");
const codeSearchStrategy_1 = require("./common/sourceMaps/codeSearchStrategy");
const renameProvider_1 = require("./common/sourceMaps/renameProvider");
const sourceMapFactory_1 = require("./common/sourceMaps/sourceMapFactory");
const sourceMapRepository_1 = require("./common/sourceMaps/sourceMapRepository");
const sourcePathResolver_1 = require("./common/sourcePathResolver");
const configuration_1 = require("./configuration");
const connection_2 = require("./dap/connection");
const ioc_extras_1 = require("./ioc-extras");
const browserAttacher_1 = require("./targets/browser/browserAttacher");
const chromeLauncher_1 = require("./targets/browser/chromeLauncher");
const edgeLauncher_1 = require("./targets/browser/edgeLauncher");
const remoteBrowserAttacher_1 = require("./targets/browser/remoteBrowserAttacher");
const remoteBrowserHelper_1 = require("./targets/browser/remoteBrowserHelper");
const remoteBrowserLauncher_1 = require("./targets/browser/remoteBrowserLauncher");
const vscodeRendererAttacher_1 = require("./targets/browser/vscodeRendererAttacher");
const delegateLauncherFactory_1 = require("./targets/delegate/delegateLauncherFactory");
const extensionHostAttacher_1 = require("./targets/node/extensionHostAttacher");
const extensionHostLauncher_1 = require("./targets/node/extensionHostLauncher");
const nodeAttacher_1 = require("./targets/node/nodeAttacher");
const nodeBinaryProvider_1 = require("./targets/node/nodeBinaryProvider");
const nodeLauncher_1 = require("./targets/node/nodeLauncher");
const nvmResolver_1 = require("./targets/node/nvmResolver");
const packageJsonProvider_1 = require("./targets/node/packageJsonProvider");
const processLauncher_1 = require("./targets/node/processLauncher");
const restartPolicy_1 = require("./targets/node/restartPolicy");
const subprocessProgramLauncher_1 = require("./targets/node/subprocessProgramLauncher");
const terminalProgramLauncher_1 = require("./targets/node/terminalProgramLauncher");
const sourcePathResolverFactory_1 = require("./targets/sourcePathResolverFactory");
const targetOrigin_1 = require("./targets/targetOrigin");
const targets_1 = require("./targets/targets");
const dapTelemetryReporter_1 = require("./telemetry/dapTelemetryReporter");
const experimentationService_1 = require("./telemetry/experimentationService");
const nullExperimentationService_1 = require("./telemetry/nullExperimentationService");
const nullTelemetryReporter_1 = require("./telemetry/nullTelemetryReporter");
const telemetryReporter_1 = require("./telemetry/telemetryReporter");
/**
 * Contains IOC container factories for the extension. We use Inverisfy, which
 * supports nested IOC containers. We have one global container, containing
 * the base extension information (like temp storage path) and delegate
 * launcher.
 *
 * For each new top-level session, we create a corresponding top-level
 * container this contains shared information, such as the logger instance,
 * common launcher implementations, etc.
 *
 * Then, for each target we receive, we create child containers. The containers
 * contain the relevant ITarget, DAP and CDP APIs, any session-specific
 * services. For some services, like the script skipper (todo), it may
 * communicate with the instance in its parent container.
 */
/**
 * Gets the container for a single target within a session.
 */
exports.createTargetContainer = (parent, target, dap, cdp) => {
    const container = new inversify_1.Container();
    container.parent = parent;
    container.bind(configuration_1.AnyLaunchConfiguration).toConstantValue(target.launchConfig);
    container.bind(ioc_extras_1.IContainer).toConstantValue(container);
    container.bind(connection_2.IDapApi).toConstantValue(dap);
    container.bind(connection_1.ICdpApi).toConstantValue(cdp);
    container.bind(targets_1.ITarget).toConstantValue(target);
    container.bind(targetOrigin_1.ITargetOrigin).toConstantValue(target.targetOrigin());
    container.bind(sourcePathResolver_1.ISourcePathResolver).toConstantValue(target.sourcePathResolver());
    container.bind(resourceProvider_1.IResourceProvider).to(statefulResourceProvider_1.StatefulResourceProvider).inSingletonScope();
    container.bind(conditions_1.IBreakpointConditionFactory).to(conditions_1.BreakpointConditionFactory).inSingletonScope();
    container.bind(logPoint_1.LogPointCompiler).toSelf().inSingletonScope();
    container.bind(performance_1.PerformanceProviderFactory).toSelf();
    container
        .bind(performance_1.IPerformanceProvider)
        .toDynamicValue(ctx => ctx.container.get(performance_1.PerformanceProviderFactory).create())
        .inSingletonScope();
    container.bind(breakpointPredictor_1.BreakpointPredictorDelegate).toSelf().inSingletonScope();
    container
        .bind(breakpointPredictor_1.IBreakpointsPredictor)
        .toDynamicValue(() => parent.get(breakpointPredictor_1.IBreakpointsPredictor).getChild())
        .inSingletonScope()
        .onActivation(ioc_extras_1.trackDispose);
    container
        .bind(telemetryReporter_1.ITelemetryReporter)
        .to(process.env.DA_TEST_DISABLE_TELEMETRY ? nullTelemetryReporter_1.NullTelemetryReporter : dapTelemetryReporter_1.DapTelemetryReporter)
        .inSingletonScope()
        .onActivation(ioc_extras_1.trackDispose);
    container.bind(breakpoints_1.BreakpointManager).toSelf().inSingletonScope();
    container.bind(sources_1.SourceContainer).toSelf().inSingletonScope();
    container.bind(diagnosics_1.Diagnostics).toSelf().inSingletonScope();
    container.bind(scriptSkipper_1.IScriptSkipper).to(implementation_1.ScriptSkipper).inSingletonScope();
    container.bind(exceptionPauseService_1.IExceptionPauseService).to(exceptionPauseService_1.ExceptionPauseService).inSingletonScope();
    container.bind(completions_1.ICompletions).to(completions_1.Completions).inSingletonScope();
    container.bind(evaluator_1.IEvaluator).to(evaluator_1.Evaluator).inSingletonScope();
    container.bind(console_1.IConsole).to(console_2.Console).inSingletonScope(); // dispose is handled by the Thread
    container.bind(basicCpuProfiler_1.BasicCpuProfiler).toSelf();
    container.bind(profiling_1.IProfilerFactory).to(profiling_1.ProfilerFactory).inSingletonScope();
    container.bind(profileController_1.IProfileController).to(profileController_1.ProfileController).inSingletonScope();
    container
        .bind(cdpProxy_1.ICdpProxyProvider)
        .to(cdpProxy_1.CdpProxyProvider)
        .inSingletonScope()
        .onActivation(ioc_extras_1.trackDispose);
    return container;
};
/**
 * Creates a container for the top-level "virtual" debug session, containing
 * shared/global services.
 */
exports.createTopLevelSessionContainer = (parent) => {
    const container = new inversify_1.Container();
    container.parent = parent;
    container.bind(ioc_extras_1.IContainer).toConstantValue(container);
    // Core services:
    container.bind(logging_1.ILogger).to(logger_1.Logger).inSingletonScope().onActivation(ioc_extras_1.trackDispose);
    container.bind(resourceProviderState_1.ResourceProviderState).toSelf().inSingletonScope();
    container.bind(resourceProvider_1.IResourceProvider).to(statefulResourceProvider_1.StatefulResourceProvider).inSingletonScope();
    container
        .bind(telemetryReporter_1.ITelemetryReporter)
        .to(process.env.DA_TEST_DISABLE_TELEMETRY ? nullTelemetryReporter_1.NullTelemetryReporter : dapTelemetryReporter_1.DapTelemetryReporter)
        .inSingletonScope()
        .onActivation(ioc_extras_1.trackDispose);
    container.bind(fileGlobList_1.OutFiles).to(fileGlobList_1.OutFiles).inSingletonScope();
    container.bind(fileGlobList_1.VueComponentPaths).to(fileGlobList_1.VueComponentPaths).inSingletonScope();
    container.bind(vueFileMapper_1.IVueFileMapper).to(vueFileMapper_1.VueFileMapper).inSingletonScope();
    container
        .bind(sourceMapRepository_1.ISearchStrategy)
        .toDynamicValue(ctx => codeSearchStrategy_1.CodeSearchStrategy.createOrFallback(ctx.container.get(logging_1.ILogger)))
        .inSingletonScope();
    container.bind(nodeBinaryProvider_1.INodeBinaryProvider).to(nodeBinaryProvider_1.InteractiveNodeBinaryProvider);
    container.bind(remoteBrowserHelper_1.RemoteBrowserHelper).toSelf().inSingletonScope().onActivation(ioc_extras_1.trackDispose);
    // Launcher logic:
    container.bind(restartPolicy_1.RestartPolicyFactory).toSelf();
    container.bind(targets_1.ILauncher).to(vscodeRendererAttacher_1.VSCodeRendererAttacher).onActivation(ioc_extras_1.trackDispose);
    container.bind(targets_1.ILauncher).to(extensionHostAttacher_1.ExtensionHostAttacher).onActivation(ioc_extras_1.trackDispose);
    container.bind(targets_1.ILauncher).to(extensionHostLauncher_1.ExtensionHostLauncher).onActivation(ioc_extras_1.trackDispose);
    container.bind(targets_1.ILauncher).to(nodeLauncher_1.NodeLauncher).onActivation(ioc_extras_1.trackDispose);
    container.bind(processLauncher_1.IProgramLauncher).to(subprocessProgramLauncher_1.SubprocessProgramLauncher);
    container.bind(processLauncher_1.IProgramLauncher).to(terminalProgramLauncher_1.TerminalProgramLauncher);
    container.bind(packageJsonProvider_1.IPackageJsonProvider).to(packageJsonProvider_1.PackageJsonProvider).inSingletonScope();
    if (parent.get(ioc_extras_1.IsVSCode)) {
        // dynamic require to not break the debug server
        container
            .bind(targets_1.ILauncher)
            .to(require('./targets/node/terminalNodeLauncher').TerminalNodeLauncher)
            .onActivation(ioc_extras_1.trackDispose);
        // request options:
        container
            .bind(requestOptionsProvider_1.IRequestOptionsProvider)
            .to(require('./ui/settingRequestOptionsProvider').SettingRequestOptionsProvider)
            .inSingletonScope();
        container
            .bind(experimentationService_1.IExperimentationService)
            .to(require('./telemetry/vscodeExperimentationService').VSCodeExperimentationService)
            .inSingletonScope();
    }
    container.bind(targets_1.ILauncher).to(nodeAttacher_1.NodeAttacher).onActivation(ioc_extras_1.trackDispose);
    container.bind(chromeLauncher_1.ChromeLauncher).toSelf().inSingletonScope().onActivation(ioc_extras_1.trackDispose);
    container.bind(targets_1.ILauncher).toService(chromeLauncher_1.ChromeLauncher);
    container.bind(targets_1.ILauncher).to(edgeLauncher_1.EdgeLauncher).inSingletonScope().onActivation(ioc_extras_1.trackDispose);
    container.bind(targets_1.ILauncher).to(remoteBrowserLauncher_1.RemoteBrowserLauncher).inSingletonScope().onActivation(ioc_extras_1.trackDispose);
    container.bind(targets_1.ILauncher).to(remoteBrowserAttacher_1.RemoteBrowserAttacher).inSingletonScope().onActivation(ioc_extras_1.trackDispose);
    container.bind(targets_1.ILauncher).to(browserAttacher_1.BrowserAttacher).onActivation(ioc_extras_1.trackDispose);
    container
        .bind(targets_1.ILauncher)
        .toDynamicValue(() => parent.get(delegateLauncherFactory_1.DelegateLauncherFactory).createLauncher(container.get(logging_1.ILogger)))
        .inSingletonScope();
    const browserFinderFactory = (ctor) => (ctx) => new ctor(ctx.container.get(ioc_extras_1.ProcessEnv), ctx.container.get(ioc_extras_1.FS), ctx.container.get(ioc_extras_1.Execa));
    container
        .bind(ioc_extras_1.BrowserFinder)
        .toDynamicValue(browserFinderFactory(vscode_js_debug_browsers_1.ChromeBrowserFinder))
        .inSingletonScope()
        .whenTargetTagged('browser', 'chrome');
    container
        .bind(ioc_extras_1.BrowserFinder)
        .toDynamicValue(browserFinderFactory(vscode_js_debug_browsers_1.EdgeBrowserFinder))
        .inSingletonScope()
        .whenTargetTagged('browser', 'edge');
    return container;
};
exports.createGlobalContainer = (options) => {
    const container = new inversify_1.Container();
    container.bind(ioc_extras_1.IContainer).toConstantValue(container);
    container.bind(delegateLauncherFactory_1.DelegateLauncherFactory).toSelf().inSingletonScope();
    container.bind(sourcePathResolverFactory_1.NodeOnlyPathResolverFactory).toSelf().inSingletonScope();
    container.bind(experimentationService_1.IExperimentationService).to(nullExperimentationService_1.NullExperimentationService).inSingletonScope();
    container.bind(ioc_extras_1.SessionSubStates).toConstantValue(new observableMap_1.ObservableMap());
    container.bind(defaultBrowserProvider_1.IDefaultBrowserProvider).to(defaultBrowserProvider_1.DefaultBrowserProvider).inSingletonScope();
    container.bind(ioc_extras_1.StoragePath).toConstantValue(options.storagePath);
    container.bind(ioc_extras_1.IsVSCode).toConstantValue(options.isVsCode);
    container.bind(nvmResolver_1.INvmResolver).to(nvmResolver_1.NvmResolver);
    container.bind(portLeaseTracker_1.IPortLeaseTracker).to(portLeaseTracker_1.PortLeaseTracker).inSingletonScope();
    container.bind(ioc_extras_1.ProcessEnv).toConstantValue(process.env);
    container.bind(ioc_extras_1.Execa).toConstantValue(execa_1.default);
    container.bind(ioc_extras_1.FS).toConstantValue(fs_1.promises);
    container.bind(fsUtils_1.IFsUtils).toConstantValue(new fsUtils_1.LocalFsUtils(fs_1.promises));
    container
        .bind(ioc_extras_1.ExtensionLocation)
        .toConstantValue(options.isRemote ? 'remote' : 'local');
    if (options.context) {
        container.bind(ioc_extras_1.ExtensionContext).toConstantValue(options.context);
    }
    // Dependency that pull from the vscode global--aren't safe to require at
    // a top level (e.g. in the debug server)
    if (options.isVsCode) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        container.bind(ioc_extras_1.VSCodeApi).toConstantValue(require('vscode'));
        require('./ui/ui-ioc').registerUiComponents(container);
    }
    return container;
};
exports.provideLaunchParams = (container, params, dap) => {
    container.bind(mutableLaunchConfig_1.MutableLaunchConfig).toConstantValue(mutableLaunchConfig_1.createMutableLaunchConfig(params));
    container.bind(configuration_1.AnyLaunchConfiguration).toService(mutableLaunchConfig_1.MutableLaunchConfig);
    container.bind(sourcePathResolverFactory_1.ISourcePathResolverFactory).to(sourcePathResolverFactory_1.SourcePathResolverFactory).inSingletonScope();
    container.bind(connection_2.IRootDapApi).toConstantValue(dap);
    container
        .bind(sourcePathResolver_1.ISourcePathResolver)
        .toDynamicValue(ctx => ctx.container
        .get(sourcePathResolverFactory_1.ISourcePathResolverFactory)
        .create(params, ctx.container.get(logging_1.ILogger)))
        .inSingletonScope();
    container
        .bind(fsUtils_1.IFsUtils)
        .toConstantValue(fsUtils_1.LocalAndRemoteFsUtils.create(params.__remoteFilePrefix, fs_1.promises, dap));
    // Source handling:
    container
        .bind(sourceMapFactory_1.ISourceMapFactory)
        .to(sourceMapFactory_1.CachingSourceMapFactory)
        .inSingletonScope()
        .onActivation(ioc_extras_1.trackDispose);
    container.bind(renameProvider_1.IRenameProvider).to(renameProvider_1.RenameProvider).inSingletonScope();
    container.bind(diagnosticToolSuggester_1.DiagnosticToolSuggester).toSelf().inSingletonScope().onActivation(ioc_extras_1.trackDispose);
    container.bind(breakpointPredictor_1.BreakpointsPredictor).toSelf();
    container
        .bind(breakpointPredictor_1.IBreakpointsPredictor)
        .toDynamicValue(ctx => new breakpointPredictor_1.BreakpointPredictorDelegate(ctx.container.get(sourceMapFactory_1.ISourceMapFactory), () => ctx.container.get(breakpointPredictor_1.BreakpointsPredictor)))
        .inSingletonScope();
};
//# sourceMappingURL=ioc.js.map
//# sourceMappingURL=ioc.js.map
