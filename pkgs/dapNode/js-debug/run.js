#!/usr/bin/env node
// This is a slightly modified version of
// https://github.com/replit/vscode-js-debug/blob/main/src/debugServer.ts

/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

const { createGlobalContainer, createTopLevelSessionContainer } = require('./src/ioc');

const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const { Binder, IBinderDelegate } = require('./src/binder');
const { default: DapConnection } = require('./src/dap/connection');
const { DebugAdapter } = require('./src/adapter/debugAdapter');
const { IDisposable } = require('./src/common/disposable');
const { TargetOrigin } = require('./src/targets/targetOrigin');
const { ILogger } = require('./src/common/logging');
const { StreamDapTransport } = require('./src/dap/transport');

const storagePath = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-js-debug-'));

class Configurator {
  constructor(dapPromise) {
    this._customBreakpoints = new Set();
    this.lastBreakpointId = 0;
    this._setBreakpointsParams = [];
    dapPromise.then(dap => this._listen(dap));
  }

  _listen(dap) {
    dap.on('setBreakpoints', async params => {
      const ids = (params.breakpoints && params.breakpoints.map(() => ++this.lastBreakpointId)) || [];
      this._setBreakpointsParams.push({ params, ids });
      const breakpoints = ids.map(id => ({
        id,
        verified: false,
        message: `Unbound breakpoint`,
      })); // TODO: Put a useful message here
      return { breakpoints };
    });

    dap.on('setExceptionBreakpoints', async params => {
      this._setExceptionBreakpointsParams = params;
      return {};
    });

    dap.on('enableCustomBreakpoints', async params => {
      for (const id of params.ids) this._customBreakpoints.add(id);
      return {};
    });

    dap.on('disableCustomBreakpoints', async params => {
      for (const id of params.ids) this._customBreakpoints.delete(id);
      return {};
    });

    dap.on('configurationDone', async () => {
      return {};
    });

    dap.on('threads', async () => {
      return { threads: [] };
    });

    dap.on('loadedSources', async () => {
      return { sources: [] };
    });
  }

  async configure(adapter) {
    if (this._setExceptionBreakpointsParams)
      await adapter.setExceptionBreakpoints(this._setExceptionBreakpointsParams);
    for (const { params, ids } of this._setBreakpointsParams)
      await adapter.breakpointManager.setBreakpoints(params, ids);
    await adapter.enableCustomBreakpoints({ ids: Array.from(this._customBreakpoints) });
    await adapter.configurationDone();
  }
}

function startDebugServer(port, host) {
  return new Promise((resolve, reject) => {
    const server = net
      .createServer(async socket => {
        const services = createTopLevelSessionContainer(
          createGlobalContainer({ storagePath, isVsCode: false }),
        );
        const binderDelegate = {
          async acquireDap() {
            // Note: we can make multi-session work through custom dap message:
            // - spin up a separate server for this session;
            // - ask ui part to create a session for us and connect to the port;
            // - marshall target name changes across.
            return connection;
          },

          async initAdapter(debugAdapter) {
            await configurator.configure(debugAdapter);
            return true;
          },

          releaseDap() {
            // no-op
          },
        };

        const transport = new StreamDapTransport(socket, socket, services.get(ILogger));
        const connection = new DapConnection(transport, services.get(ILogger));
        new Binder(binderDelegate, connection, services, new TargetOrigin('targetOrigin'));
        const configurator = new Configurator(connection.dap());
      })
      .on('error', reject)
      .listen({ port, host }, () => {
        // This is the only change: instead of printing the port used to stdout,
        // send it over FD 3.
        const fd3 = fs.createWriteStream(null, {fd: 3});
        fd3.write(`${server.address().port}`, () => fd3.close());
        resolve({
          dispose: () => {
            server.close();
          },
        });
      });
  });
}

startDebugServer(0, 'localhost');
