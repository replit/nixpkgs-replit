"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DelegateLauncher = void 0;
const observableMap_1 = require("../../common/datastructure/observableMap");
const events_1 = require("../../common/events");
const proxyLogger_1 = require("../../common/logging/proxyLogger");
const targetOrigin_1 = require("../targetOrigin");
/**
 * The DelegateLauncher is a 'fake' launcher that can take launch requests
 * referencing an existing session ID.
 *
 * This is used for the debugger terminal; we create a terminal instance, which
 * sets up a debug server and gets CDP connections. We don't want to actually
 * start debugging until someone connects to us, so when that happens we store
 * the newly created target in the {@link DelegateLauncherFactory}, and
 * reference its ID in a request to launch through VS Code.
 *
 * That ends up in this launcher, which looks up and returns the existing
 * session by its ID. We also watch and proxy and children of launched targets
 * through this delegate, since they will have been getting created externally.
 */
class DelegateLauncher {
    constructor(parentList, logger) {
        this.parentList = parentList;
        this.logger = logger;
        /**
         * Target list.
         */
        this.targets = new observableMap_1.ObservableMap();
        /**
         * Underlying emitter fired when sessions terminate. Listened to by the
         * binder and used to trigger a `terminate` message on the DAP.
         */
        this.onTerminatedEmitter = new events_1.EventEmitter();
        /**
         * @inheritdoc
         */
        this.onTerminated = this.onTerminatedEmitter.event;
        /**
         * @inheritdoc
         */
        this.onTargetListChanged = this.targets.onChanged;
        parentList.onAdd(([, ref]) => {
            // we don't need to recurse upwards for the parents, since we know we
            // will have previously seen and `add()`ed its direct parent.
            if (ref.parent && this.targets.get(ref.parent.id)) {
                this.targets.add(ref.id, ref.target);
            }
        });
        parentList.onRemove(([id]) => {
            // Note that we only check the size if we actually removed something.
            // Otherwise, we could get a removal event from an old session before
            // we boot up our new terminal command.
            if (this.targets.remove(id) && !this.targets.size) {
                this.onTerminatedEmitter.fire({ killed: true, code: 0 });
            }
        });
    }
    /**
     * @inheritdoc
     */
    async launch(params, context) {
        if (params.type !== "node-terminal" /* Terminal */ || params.request !== 'attach') {
            return { blockSessionTermination: false };
        }
        const delegate = this.parentList.get(params.delegateId);
        if (delegate === undefined) {
            // Parent session was disconnected. Take the launch, but then say it's
            // town down a moment later. Ref: https://github.com/microsoft/vscode/issues/106576
            setTimeout(() => this.onTerminatedEmitter.fire({ killed: true, code: 0 }), 1);
            return { blockSessionTermination: true };
        }
        const origin = delegate.target.targetOrigin();
        if (!(origin instanceof targetOrigin_1.MutableTargetOrigin)) {
            throw new Error(`Expected delegate session to have a mutable target origin`);
        }
        const logger = delegate.target.logger;
        if (!(logger instanceof proxyLogger_1.ProxyLogger)) {
            throw new Error(`Expected delegate session to have a proxy logger`);
        }
        // Update the origin to 're-home' it under the current debug session,
        // initially the debug adater will set it to a garbage string.
        origin.id = context.targetOrigin.id;
        // Update the target's logger to point to the one for the current session.
        logger.connectTo(this.logger);
        setTimeout(() => {
            this.targets.add(params.delegateId, delegate.target);
            delegate.dap.connect(context.dap);
        }, 0);
        return { blockSessionTermination: true };
    }
    /**
     * @inheritdoc
     */
    terminate() {
        for (const session of this.targets.value()) {
            session.stop();
        }
        return Promise.resolve();
    }
    /**
     * @inheritdoc
     */
    disconnect() {
        return this.terminate();
    }
    /**
     * @inheritdoc
     */
    restart() {
        for (const session of this.targets.value()) {
            session.restart();
        }
        return Promise.resolve();
    }
    /**
     * @inheritdoc
     */
    targetList() {
        return [...this.targets.value()];
    }
    /**
     * @inheritdoc
     */
    dispose() {
        this.terminate();
    }
}
exports.DelegateLauncher = DelegateLauncher;
//# sourceMappingURL=delegateLauncher.js.map
//# sourceMappingURL=delegateLauncher.js.map
