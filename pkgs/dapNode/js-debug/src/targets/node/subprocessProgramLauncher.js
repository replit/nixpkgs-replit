"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubprocessProgramLauncher = void 0;
const child_process_1 = require("child_process");
const inversify_1 = require("inversify");
const environmentVars_1 = require("../../common/environmentVars");
const logging_1 = require("../../common/logging");
const processLauncher_1 = require("./processLauncher");
const program_1 = require("./program");
/**
 * Launcher that boots a subprocess.
 */
let SubprocessProgramLauncher = class SubprocessProgramLauncher {
    constructor(logger) {
        this.logger = logger;
    }
    canLaunch(args) {
        return args.console === 'internalConsole';
    }
    async launchProgram(binary, config, context) {
        const { executable, args, shell } = formatArguments(binary, processLauncher_1.getNodeLaunchArgs(config));
        // Send an appoximation of the command we're running to
        // the terminal, for cosmetic purposes.
        context.dap.output({
            category: 'console',
            output: [executable, ...args].join(' '),
        });
        const child = child_process_1.spawn(executable, args, {
            shell,
            cwd: config.cwd,
            env: environmentVars_1.EnvironmentVars.merge(environmentVars_1.EnvironmentVars.processEnv(), config.env).defined(),
        });
        if (config.outputCapture === "console" /* Console */) {
            this.discardStdio(context.dap, child);
        }
        else {
            this.captureStdio(context.dap, child);
        }
        return new program_1.SubprocessProgram(child, this.logger, config.killBehavior);
    }
    /**
     * Called for a child process when the stdio should be written over DAP.
     */
    captureStdio(dap, child) {
        child.stdout.on('data', data => dap.output({ category: 'stdout', output: data.toString() }));
        child.stderr.on('data', data => dap.output({ category: 'stderr', output: data.toString() }));
        child.stdout.resume();
        child.stderr.resume();
    }
    /**
     * Called for a child process when the stdio is not supposed to be captured.
     */
    discardStdio(dap, child) {
        // Catch any errors written before the debugger attaches, otherwise things
        // like module not found errors will never be written.
        let preLaunchBuffer = [];
        const dumpFilter = () => {
            if (preLaunchBuffer) {
                dap.output({ category: 'stderr', output: Buffer.concat(preLaunchBuffer).toString() });
            }
        };
        const delimiter = Buffer.from('Debugger attached.');
        const errLineReader = (data) => {
            if (data.includes(delimiter)) {
                preLaunchBuffer = undefined;
                child.stderr.removeListener('data', errLineReader);
            }
            else if (preLaunchBuffer) {
                preLaunchBuffer.push(data);
            }
        };
        child.stderr.on('data', errLineReader);
        child.on('error', err => {
            dumpFilter();
            dap.output({ category: 'stderr', output: err.stack || err.message });
        });
        child.on('exit', code => {
            if (code !== null && code > 0) {
                dumpFilter();
                dap.output({
                    category: 'stderr',
                    output: `Process exited with code ${code}\r\n`,
                });
            }
        });
        // must be called for https://github.com/microsoft/vscode/issues/102254
        child.stdout.resume();
        child.stderr.resume();
    }
};
SubprocessProgramLauncher = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(logging_1.ILogger))
], SubprocessProgramLauncher);
exports.SubprocessProgramLauncher = SubprocessProgramLauncher;
// Fix for: https://github.com/microsoft/vscode/issues/45832,
// which still seems to be a thing according to the issue tracker.
// From: https://github.com/microsoft/vscode-node-debug/blob/47747454bc6e8c9e48d8091eddbb7ffb54a19bbe/src/node/nodeDebug.ts#L1120
const formatArguments = (executable, args) => {
    if (process.platform !== 'win32' || !executable.includes(' ')) {
        return { executable, args, shell: false };
    }
    let foundArgWithSpace = false;
    // check whether there is one arg with a space
    const output = [];
    for (const a of args) {
        if (a.includes(' ')) {
            output.push(`"${a}"`);
            foundArgWithSpace = true;
        }
        else {
            output.push(a);
        }
    }
    if (foundArgWithSpace) {
        return { executable: `"${executable}"`, args: output, shell: true };
    }
    return { executable, args, shell: false };
};
//# sourceMappingURL=subprocessProgramLauncher.js.map
//# sourceMappingURL=subprocessProgramLauncher.js.map
