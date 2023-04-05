"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Frame = exports.FrameModel = void 0;
const url_1 = require("url");
const path = __importStar(require("path"));
const events_1 = require("../../common/events");
class FrameModel {
    constructor() {
        this._onFrameAddedEmitter = new events_1.EventEmitter();
        this._onFrameRemovedEmitter = new events_1.EventEmitter();
        this._onFrameNavigatedEmitter = new events_1.EventEmitter();
        this.onFrameAdded = this._onFrameAddedEmitter.event;
        this.onFrameRemoved = this._onFrameRemovedEmitter.event;
        this.onFrameNavigated = this._onFrameNavigatedEmitter.event;
        this._frames = new Map();
    }
    attached(cdp, targetId) {
        cdp.Page.enable({});
        cdp.Page.getResourceTree({}).then(result => {
            this._processCachedResources(cdp, result ? result.frameTree : undefined, targetId);
        });
    }
    mainFrame() {
        return this._mainFrame;
    }
    _processCachedResources(cdp, mainFramePayload, targetId) {
        if (mainFramePayload)
            this._addFramesRecursively(cdp, mainFramePayload, mainFramePayload.frame.parentId, targetId);
        cdp.Page.on('frameAttached', event => {
            this._frameAttached(cdp, targetId, event.frameId, event.parentFrameId);
        });
        cdp.Page.on('frameNavigated', event => {
            this._frameNavigated(cdp, targetId, event.frame);
        });
        cdp.Page.on('frameDetached', event => {
            this._frameDetached(cdp, targetId, event.frameId);
        });
    }
    _addFrame(cdp, frameId, parentFrameId) {
        const frame = new Frame(this, cdp, frameId, parentFrameId);
        this._frames.set(frame.id, frame);
        if (frame.isMainFrame())
            this._mainFrame = frame;
        this._onFrameAddedEmitter.fire(frame);
        return frame;
    }
    _frameAttached(cdp, targetId, frameId, parentFrameId) {
        let frame = this._frames.get(frameId);
        if (!frame)
            frame = this._addFrame(cdp, frameId, parentFrameId);
        frame._ref(targetId);
        return frame;
    }
    _frameNavigated(cdp, targetId, framePayload) {
        let frame = this._frames.get(framePayload.id);
        if (!frame) {
            // Simulate missed "frameAttached" for a main frame navigation to the new backend process.
            frame = this._frameAttached(cdp, targetId, framePayload.id, framePayload.parentId);
        }
        frame._navigate(framePayload, targetId);
        this._onFrameNavigatedEmitter.fire(frame);
    }
    _frameDetached(cdp, targetId, frameId) {
        const frame = this._frames.get(frameId);
        if (!frame)
            return;
        frame._unref(targetId);
    }
    frameForId(frameId) {
        return this._frames.get(frameId);
    }
    frames() {
        return Array.from(this._frames.values());
    }
    _addFramesRecursively(cdp, frameTreePayload, parentFrameId, targetId) {
        const framePayload = frameTreePayload.frame;
        let frame = this._frames.get(framePayload.id);
        if (frame) {
            frame._navigate(framePayload, targetId);
            this._onFrameNavigatedEmitter.fire(frame);
        }
        else {
            frame = this._addFrame(cdp, framePayload.id, parentFrameId);
            frame._navigate(framePayload, targetId);
        }
        for (let i = 0; frameTreePayload.childFrames && i < frameTreePayload.childFrames.length; ++i)
            this._addFramesRecursively(cdp, frameTreePayload.childFrames[i], frame.id, targetId);
    }
}
exports.FrameModel = FrameModel;
class Frame {
    constructor(model, cdp, frameId, parentFrameId) {
        this._targets = new Set();
        this.cdp = cdp;
        this.model = model;
        this._parentFrameId = parentFrameId;
        this.id = frameId;
        this._url = '';
    }
    _ref(targetId) {
        this._targets.add(targetId);
    }
    _navigate(payload, targetId) {
        this._name = payload.name;
        this._url = payload.url;
        this._securityOrigin = payload.securityOrigin;
        this._unreachableUrl = payload.unreachableUrl || '';
        this._ref(targetId);
        this._unrefChildFrames(targetId);
    }
    name() {
        return this._name || '';
    }
    url() {
        return this._url;
    }
    securityOrigin() {
        return this._securityOrigin;
    }
    unreachableUrl() {
        return this._unreachableUrl;
    }
    isMainFrame() {
        return !this._parentFrameId;
    }
    parentFrame() {
        return this._parentFrameId ? this.model.frameForId(this._parentFrameId) : undefined;
    }
    childFrames() {
        return this.model.frames().filter(frame => frame._parentFrameId === this.id);
    }
    _unrefChildFrames(targetId) {
        for (const child of this.childFrames())
            child._unref(targetId);
    }
    _unref(targetId) {
        this._targets.delete(targetId);
        if (this._targets.size)
            return;
        this._unrefChildFrames(targetId);
        this.model._frames.delete(this.id);
        this.model._onFrameRemovedEmitter.fire(this);
    }
    displayName() {
        if (this._name)
            return this._name;
        return displayName(this._url) || `<iframe ${this.id}>`;
    }
}
exports.Frame = Frame;
function trimEnd(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return text.substr(0, maxLength - 1) + '…';
}
function displayName(urlstring) {
    let url;
    try {
        url = new url_1.URL(urlstring);
    }
    catch (e) {
        return trimEnd(urlstring, 20);
    }
    if (url.protocol === 'data')
        return trimEnd(urlstring, 20);
    if (url.protocol === 'blob')
        return urlstring;
    if (urlstring === 'about:blank')
        return urlstring;
    let displayName = path.basename(url.pathname);
    if (!displayName)
        displayName = (url.host || '') + '/';
    if (displayName === '/')
        displayName = trimEnd(urlstring, 20);
    return displayName;
}
//# sourceMappingURL=frames.js.map
//# sourceMappingURL=frames.js.map
