"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_LIMITS = exports.ELO_CONFIG = void 0;
// ELO Configuration
exports.ELO_CONFIG = {
    K_BASE: 32,
    N0: 30,
    RATING_INIT: 1200
};
// Plan Limits
exports.PLAN_LIMITS = {
    free: {
        maxGroups: 2,
        maxMembersPerGroup: 5,
        seasonsEnabled: false
    },
    premium: {
        maxGroups: -1,
        maxMembersPerGroup: -1,
        seasonsEnabled: true
    }
};
//# sourceMappingURL=constants.js.map