"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Base01Position = exports.Base1Position = exports.Base0Position = exports.comparePositions = void 0;
exports.comparePositions = (a, b) => {
    if (a instanceof Base0Position) {
        return a.compare(b.base0);
    }
    else if (a instanceof Base01Position) {
        return b.compare(b.base01);
    }
    else if (a instanceof Base1Position) {
        return b.compare(b.base1);
    }
    else {
        throw new Error(`Invalid position ${a}`);
    }
};
/**
 * A position that starts a line 0 and column 0 (used by CDP).
 */
class Base0Position {
    constructor(lineNumber, columnNumber) {
        this.lineNumber = lineNumber;
        this.columnNumber = columnNumber;
    }
    get base0() {
        return this;
    }
    get base1() {
        return new Base1Position(this.lineNumber + 1, this.columnNumber + 1);
    }
    get base01() {
        return new Base01Position(this.lineNumber, this.columnNumber + 1);
    }
    compare(other) {
        return this.lineNumber - other.lineNumber || this.columnNumber - other.columnNumber || 0;
    }
}
exports.Base0Position = Base0Position;
/**
 * A position that starts a line 1 and column 1 (used by DAP).
 */
class Base1Position {
    constructor(lineNumber, columnNumber) {
        this.lineNumber = lineNumber;
        this.columnNumber = columnNumber;
    }
    get base0() {
        return new Base0Position(this.lineNumber - 1, this.columnNumber - 1);
    }
    get base1() {
        return this;
    }
    get base01() {
        return new Base01Position(this.lineNumber - 1, this.columnNumber);
    }
    compare(other) {
        return this.lineNumber - other.lineNumber || this.columnNumber - other.columnNumber || 0;
    }
}
exports.Base1Position = Base1Position;
/**
 * A position that starts a line 0 and column 1 (used by sourcemaps).
 */
class Base01Position {
    constructor(lineNumber, columnNumber) {
        this.lineNumber = lineNumber;
        this.columnNumber = columnNumber;
    }
    get base0() {
        return new Base0Position(this.lineNumber - 1, this.columnNumber);
    }
    get base1() {
        return new Base1Position(this.lineNumber, this.columnNumber + 1);
    }
    get base01() {
        return this;
    }
    compare(other) {
        return this.lineNumber - other.lineNumber || this.columnNumber - other.columnNumber || 0;
    }
}
exports.Base01Position = Base01Position;
//# sourceMappingURL=positions.js.map
//# sourceMappingURL=positions.js.map
