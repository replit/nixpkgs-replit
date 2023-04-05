"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeLogPoint = void 0;
/**
 * A logpoint that requires being paused and running a custom expression to
 * log correctly.
 */
class RuntimeLogPoint {
    constructor(invoke) {
        this.invoke = invoke;
        this.breakCondition = undefined;
    }
    async shouldStayPaused(details) {
        await this.invoke({ callFrameId: details.callFrames[0].callFrameId });
        return false;
    }
}
exports.RuntimeLogPoint = RuntimeLogPoint;
//# sourceMappingURL=runtimeLogPoint.js.map
//# sourceMappingURL=runtimeLogPoint.js.map
