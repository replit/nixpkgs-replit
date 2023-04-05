"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.MutableTargetOrigin = exports.TargetOrigin = exports.ITargetOrigin = void 0;
exports.ITargetOrigin = Symbol('ITargetOrigin');
/**
 * Immutable implementation of ITargetOrigin.
 */
class TargetOrigin {
    constructor(id) {
        this.id = id;
    }
}
exports.TargetOrigin = TargetOrigin;
/**
 * A mutable version of ITargetOrigin. Used in the {@link DelegateLauncher}.
 */
class MutableTargetOrigin {
    constructor(id) {
        this.id = id;
    }
}
exports.MutableTargetOrigin = MutableTargetOrigin;
//# sourceMappingURL=targetOrigin.js.map
//# sourceMappingURL=targetOrigin.js.map
