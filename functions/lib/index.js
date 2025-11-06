"use strict";
// Cloud Functions for EloHero
// Main entry point that exports all functions
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Initialize Firebase Admin (must be done before importing other modules)
require("./utils/admin");
// Export all functions
__exportStar(require("./groups"), exports);
__exportStar(require("./seasons"), exports);
__exportStar(require("./members"), exports);
__exportStar(require("./matches"), exports);
__exportStar(require("./subscriptions"), exports);
__exportStar(require("./users"), exports);
__exportStar(require("./scheduled"), exports);
//# sourceMappingURL=index.js.map