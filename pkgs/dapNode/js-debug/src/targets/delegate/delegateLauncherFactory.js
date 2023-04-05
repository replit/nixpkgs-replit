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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DelegateLauncherFactory = void 0;
const observableMap_1 = require("../../common/datastructure/observableMap");
const delegateLauncher_1 = require("./delegateLauncher");
const inversify_1 = require("inversify");
let idCounter = 0;
/**
 * An extension-global instance used to shuffle delegated launch sessions.
 * See docblocks on {@link DelegateLauncher} for usage details.
 */
let DelegateLauncherFactory = class DelegateLauncherFactory {
    constructor() {
        this.delegateSessions = new observableMap_1.ObservableMap();
        this.refsByTarget = new WeakMap();
    }
    /**
     * Returns a new launcher that references this delegate sessions.
     */
    createLauncher(logger) {
        return new delegateLauncher_1.DelegateLauncher(this.delegateSessions, logger);
    }
    /**
     * Adds a new delegate target, returning the ID of the created delegate.
     */
    addDelegate(target, dap, parent) {
        const ref = { id: idCounter++, target, dap, parent: parent && this.refsByTarget.get(parent) };
        this.refsByTarget.set(target, ref);
        this.delegateSessions.add(ref.id, ref);
        return ref.id;
    }
    /**
     * Removes a delegate target, returning the ID of the destroyed delegate.
     */
    removeDelegate(target) {
        const ref = this.refsByTarget.get(target);
        if (ref) {
            this.delegateSessions.remove(ref.id);
        }
    }
};
DelegateLauncherFactory = __decorate([
    inversify_1.injectable()
], DelegateLauncherFactory);
exports.DelegateLauncherFactory = DelegateLauncherFactory;
//# sourceMappingURL=delegateLauncherFactory.js.map
//# sourceMappingURL=delegateLauncherFactory.js.map
