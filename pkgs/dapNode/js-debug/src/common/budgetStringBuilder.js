"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetStringBuilder = void 0;
class BudgetStringBuilder {
    constructor(budget, join) {
        this._tokens = [];
        this._separator = join || '';
        this._budget = budget - 1 - this._separator.length; // Space for ellipsis.
    }
    append(text) {
        if (text.length > this.budget()) {
            this.appendEllipsis();
            return;
        }
        this._append(text);
    }
    _append(text) {
        if (this._tokens.length)
            this._budget -= this._separator.length;
        this._tokens.push(text);
        this._budget -= text.length;
    }
    appendEllipsis() {
        if (this._tokens[this._tokens.length - 1] !== '…')
            this._append('…');
    }
    checkBudget() {
        if (this._budget <= 0)
            this.appendEllipsis();
        return this._budget > 0;
    }
    budget() {
        return this._budget - (this._tokens.length ? this._separator.length : 0);
    }
    build() {
        return this._tokens.join(this._separator);
    }
    isEmpty() {
        return !this._tokens.length;
    }
}
exports.BudgetStringBuilder = BudgetStringBuilder;
//# sourceMappingURL=budgetStringBuilder.js.map
//# sourceMappingURL=budgetStringBuilder.js.map
