"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservableMap = void 0;
const events_1 = require("../events");
/**
 * A wrapper around map that fires an event emitter when it's mutated. Used
 * for manging lists of targets.
 */
class ObservableMap {
    constructor() {
        this.changeEmitter = new events_1.EventEmitter();
        this.addEmitter = new events_1.EventEmitter();
        this.removeEmitter = new events_1.EventEmitter();
        this.targetMap = new Map();
        /**
         * Event emitter that fires when the list of targets changes.
         */
        this.onChanged = this.changeEmitter.event;
        /**
         * Event emitter that fires when the list of targets is added to.
         */
        this.onAdd = this.addEmitter.event;
        /**
         * Event emitter that fires when the list of targets is removed from.
         */
        this.onRemove = this.removeEmitter.event;
    }
    /**
     * Gets the number of elements in the map.
     */
    get size() {
        return this.targetMap.size;
    }
    /**
     * Adds a new target to the list
     */
    add(key, target) {
        this.targetMap.set(key, target);
        this.addEmitter.fire([key, target]);
        this.changeEmitter.fire();
    }
    /**
     * Gets a target by opener ID.
     */
    get(key) {
        return this.targetMap.get(key);
    }
    /**
     * Removes a target by opener ID.
     * @returns true if a value was removed
     */
    remove(key) {
        const previous = this.targetMap.get(key);
        if (previous === undefined) {
            return false;
        }
        this.targetMap.delete(key);
        this.removeEmitter.fire([key, previous]);
        this.changeEmitter.fire();
        return true;
    }
    /**
     * Returns a list of known targets.
     */
    value() {
        return this.targetMap.values();
    }
}
exports.ObservableMap = ObservableMap;
//# sourceMappingURL=observableMap.js.map
//# sourceMappingURL=observableMap.js.map
