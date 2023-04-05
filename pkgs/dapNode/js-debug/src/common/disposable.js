"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisposableList = exports.noOpDisposable = exports.RefCounter = void 0;
const objUtils_1 = require("./objUtils");
class RefCounter {
    constructor(value) {
        this.value = value;
        this.disposed = false;
        this.count = 0;
    }
    checkout() {
        if (this.disposed) {
            throw new Error('Cannot checkout a disposed instance');
        }
        this.count++;
        return {
            value: this.value,
            dispose: objUtils_1.once(() => {
                if (--this.count === 0) {
                    this.dispose();
                }
            }),
        };
    }
    dispose() {
        if (!this.disposed) {
            this.disposed = true;
            this.value.dispose;
        }
    }
}
exports.RefCounter = RefCounter;
/**
 * A dispoable that does nothing.
 */
exports.noOpDisposable = { dispose: () => undefined };
/**
 * Wraps the list as an IDisposable that invokes each list item once a dispose
 * happens. Has an advantage over simple arrays in that, once disposed, any
 * new items added are immediately disposed, avoiding some leaks.
 */
class DisposableList {
    constructor(initialItems) {
        this.disposed = false;
        this.items = [];
        if (initialItems) {
            this.items = initialItems.slice();
        }
    }
    get isDisposed() {
        return this.disposed;
    }
    /**
     * Adds a callback fires when the list is disposed of.
     */
    callback(...disposals) {
        for (const dispose of disposals) {
            this.push({ dispose });
        }
    }
    push(...newItems) {
        if (this.disposed) {
            newItems.forEach(d => d.dispose());
            return newItems[0];
        }
        this.items.push(...newItems);
        return newItems[0];
    }
    /**
     * Removes the item from the list and disposes it.
     */
    disposeObject(d) {
        this.items = this.items.filter(i => i !== d);
        d.dispose();
    }
    /**
     * @inheritdoc
     */
    dispose() {
        const r = Promise.all(this.items.map(i => i.dispose()));
        this.items = [];
        this.disposed = true;
        return r;
    }
}
exports.DisposableList = DisposableList;
//# sourceMappingURL=disposable.js.map
//# sourceMappingURL=disposable.js.map
