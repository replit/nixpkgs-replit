"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListenerMap = exports.EventEmitter = void 0;
const objUtils_1 = require("./objUtils");
class EventEmitter {
    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this._listeners = new Set();
        this.event = (listener, thisArg, disposables) => {
            const data = { listener, thisArg };
            this._listeners.add(data);
            const result = {
                dispose: () => {
                    result.dispose = () => {
                        /* no-op */
                    };
                    this._listeners.delete(data);
                },
            };
            if (disposables)
                disposables.push(result);
            return result;
        };
    }
    get size() {
        return this._listeners.size;
    }
    fire(event) {
        const dispatch = !this._deliveryQueue;
        if (!this._deliveryQueue)
            this._deliveryQueue = [];
        for (const data of this._listeners)
            this._deliveryQueue.push({ data, event });
        if (!dispatch)
            return;
        for (let index = 0; index < this._deliveryQueue.length; index++) {
            const { data, event } = this._deliveryQueue[index];
            data.listener.call(data.thisArg, event);
        }
        this._deliveryQueue = undefined;
    }
    dispose() {
        this._listeners.clear();
        if (this._deliveryQueue)
            this._deliveryQueue = [];
    }
}
exports.EventEmitter = EventEmitter;
/**
 * Map of listeners that deals with refcounting.
 */
class ListenerMap {
    constructor() {
        this.map = new Map();
        this.listeners = this.map;
    }
    /**
     * Adds a listener for the givne event.
     */
    listen(key, handler) {
        let emitter = this.map.get(key);
        if (!emitter) {
            emitter = new EventEmitter();
            this.map.set(key, emitter);
        }
        const listener = emitter.event(handler);
        return {
            dispose: objUtils_1.once(() => {
                listener.dispose();
                if ((emitter === null || emitter === void 0 ? void 0 : emitter.size) === 0) {
                    this.map.delete(key);
                }
            }),
        };
    }
    /**
     * Emits the event for the listener.
     */
    emit(event, value) {
        var _a;
        (_a = this.listeners.get(event)) === null || _a === void 0 ? void 0 : _a.fire(value);
    }
}
exports.ListenerMap = ListenerMap;
//# sourceMappingURL=events.js.map
//# sourceMappingURL=events.js.map
