"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMutableLaunchConfig = exports.MutableLaunchConfig = void 0;
const events_1 = require("./events");
exports.MutableLaunchConfig = Symbol('MutableLaunchConfig');
exports.createMutableLaunchConfig = (source) => {
    const change = new events_1.EventEmitter();
    return new Proxy({}, {
        ownKeys() {
            return Object.keys(source);
        },
        get(_target, key) {
            switch (key) {
                case 'update':
                    return (value) => {
                        source = value;
                        change.fire();
                    };
                case 'onChange':
                    return change.event;
                default:
                    return source[key];
            }
        },
    });
};
//# sourceMappingURL=mutableLaunchConfig.js.map
//# sourceMappingURL=mutableLaunchConfig.js.map
