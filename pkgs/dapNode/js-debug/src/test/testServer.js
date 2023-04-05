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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path = __importStar(require("path"));
const port = +process.argv[2];
const app = express_1.default();
const webRoot = path.join(__dirname, '..', '..', '..', 'testWorkspace', 'web');
app.get('/cookies/home', (req, res) => {
    res.header('Set-Cookie', 'authed=true');
    res.sendFile(path.join(webRoot, 'browserify/pause.html'));
});
app.get('/unique-refresh', (req, res) => {
    res.send(`<script src="hello.js?v=${req.query.v}"></script>`);
});
app.get('/redirect-test/home', (req, res) => {
    res.header('Set-Cookie', 'authed=true');
    res.sendFile(path.join(webRoot, 'browserify/pause.html'));
});
app.get('/redirect-test/:resource', (req, res) => {
    if (req.params.resource.endsWith('.map')) {
        res.redirect(`/browserify/${req.params.resource}`);
    }
    else {
        res.sendFile(path.join(webRoot, `browserify/${req.params.resource}`));
    }
});
app.use('/cookies', (req, res, next) => {
    var _a;
    if (!((_a = req.headers.cookie) === null || _a === void 0 ? void 0 : _a.includes('authed=true'))) {
        res.status(403).send('access denied');
    }
    else {
        next();
    }
}, express_1.default.static(path.join(webRoot, 'browserify')));
app.get('/redirect-to-greet', (_req, res) => res.redirect('/greet'));
app.get('/view-headers', (req, res) => res.json(req.headers));
app.get('/greet', (_req, res) => res.send('Hello world!'));
app.use('/', express_1.default.static(path.join(webRoot)));
app.listen(port, () => {
    process.send('ready');
});
//# sourceMappingURL=testServer.js.map
//# sourceMappingURL=testServer.js.map
