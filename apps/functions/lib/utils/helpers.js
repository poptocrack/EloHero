"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTeamEloChanges = exports.calculateEloChanges = exports.generateInviteCodeHelper = exports.checkPlanLimit = exports.getUserPlan = void 0;
const admin = __importStar(require("firebase-admin"));
const db_1 = require("./db");
const constants_1 = require("./constants");
// Helper function to get user plan
async function getUserPlan(uid) {
    var _a;
    try {
        const userRecord = await admin.auth().getUser(uid);
        // First check custom claims (fastest, but may be stale)
        const claimsPlan = (_a = userRecord.customClaims) === null || _a === void 0 ? void 0 : _a.plan;
        if (claimsPlan === 'premium') {
            return 'premium';
        }
        // Fallback: Check Firestore user document (more reliable, checks actual subscription status)
        const userDoc = await db_1.db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            const firestorePlan = userData === null || userData === void 0 ? void 0 : userData.plan;
            const subscriptionStatus = userData === null || userData === void 0 ? void 0 : userData.subscriptionStatus;
            // Check if user has active premium subscription in Firestore
            if (firestorePlan === 'premium' && subscriptionStatus === 'active') {
                // Check if subscription hasn't expired
                const subscriptionEndDate = userData === null || userData === void 0 ? void 0 : userData.subscriptionEndDate;
                if (subscriptionEndDate) {
                    const endDate = subscriptionEndDate.toDate
                        ? subscriptionEndDate.toDate()
                        : new Date(subscriptionEndDate);
                    const now = new Date();
                    if (endDate > now) {
                        // Sync custom claims if they're out of date
                        if (!claimsPlan || claimsPlan === 'free') {
                            try {
                                await admin.auth().setCustomUserClaims(uid, {
                                    plan: 'premium',
                                    subscriptionStatus: 'active'
                                });
                            }
                            catch (claimsError) {
                                // Continue anyway, we still return premium based on Firestore
                            }
                        }
                        return 'premium';
                    }
                }
                else {
                    // No expiration date, assume active
                    return 'premium';
                }
            }
        }
        const plan = claimsPlan || 'free';
        return plan;
    }
    catch (error) {
        return 'free';
    }
}
exports.getUserPlan = getUserPlan;
// Helper function to check plan limits
function checkPlanLimit(plan, limitType, currentCount) {
    const limits = constants_1.PLAN_LIMITS[plan];
    const maxLimit = limitType === 'groups' ? limits.maxGroups : limits.maxMembersPerGroup;
    return maxLimit !== -1 && currentCount >= maxLimit;
}
exports.checkPlanLimit = checkPlanLimit;
// Helper function to generate invite code
function generateInviteCodeHelper() {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWYZ123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
exports.generateInviteCodeHelper = generateInviteCodeHelper;
// Helper function to calculate ELO changes
function calculateEloChanges(participants) {
    const n = participants.length;
    const results = [];
    for (let i = 0; i < n; i++) {
        const player = participants[i];
        let totalExpectedScore = 0;
        let totalActualScore = 0;
        // Calculate expected and actual scores against all other players
        for (let j = 0; j < n; j++) {
            if (i !== j) {
                const opponent = participants[j];
                // Expected score calculation
                const expectedScore = 1 / (1 + Math.pow(10, (opponent.ratingBefore - player.ratingBefore) / 400));
                totalExpectedScore += expectedScore;
                // Actual score based on placement
                let actualScore;
                if (player.placement < opponent.placement) {
                    actualScore = 1; // Player finished higher
                }
                else if (player.placement > opponent.placement) {
                    actualScore = 0; // Player finished lower
                }
                else {
                    actualScore = 0.5; // Tie
                }
                totalActualScore += actualScore;
            }
        }
        // Calculate K factor (decreases with more games)
        const kFactor = constants_1.ELO_CONFIG.K_BASE * (1 / (1 + player.gamesPlayed / constants_1.ELO_CONFIG.N0));
        // Calculate rating change
        const ratingChange = Math.round(kFactor * (totalActualScore - totalExpectedScore));
        const newRating = player.ratingBefore + ratingChange;
        results.push(Object.assign(Object.assign({}, player), { ratingAfter: newRating, ratingChange }));
    }
    return results;
}
exports.calculateEloChanges = calculateEloChanges;
/**
 * Calculate ELO changes for teams based on their placements
 * Team elo is calculated as the average of team members' elo
 * All members of a team receive the same elo change
 */
function calculateTeamEloChanges(teams) {
    const n = teams.length;
    const results = [];
    // First, calculate team-level elo changes
    const teamResults = [];
    for (let i = 0; i < n; i++) {
        const team = teams[i];
        let totalExpectedScore = 0;
        let totalActualScore = 0;
        // Calculate expected and actual scores against all other teams
        for (let j = 0; j < n; j++) {
            if (i !== j) {
                const opponent = teams[j];
                // Expected score calculation (team vs team)
                const expectedScore = 1 / (1 + Math.pow(10, (opponent.teamRating - team.teamRating) / 400));
                totalExpectedScore += expectedScore;
                // Actual score based on placement
                let actualScore;
                if (team.placement < opponent.placement) {
                    actualScore = 1; // Team finished higher
                }
                else if (team.placement > opponent.placement) {
                    actualScore = 0; // Team finished lower
                }
                else {
                    actualScore = 0.5; // Tie
                }
                totalActualScore += actualScore;
            }
        }
        // Calculate average games played for the team (for K factor calculation)
        const avgGamesPlayed = team.members.length > 0
            ? Math.round(team.members.reduce((sum, m) => sum + m.gamesPlayed, 0) / team.members.length)
            : 0;
        // Calculate K factor (decreases with more games)
        const kFactor = constants_1.ELO_CONFIG.K_BASE * (1 / (1 + avgGamesPlayed / constants_1.ELO_CONFIG.N0));
        // Calculate team rating change
        const teamRatingChange = Math.round(kFactor * (totalActualScore - totalExpectedScore));
        const teamRatingAfter = team.teamRating + teamRatingChange;
        teamResults.push({
            teamId: team.id,
            teamRatingBefore: team.teamRating,
            teamRatingAfter,
            teamRatingChange
        });
    }
    // Apply team elo changes to all team members equally
    for (const team of teams) {
        const teamResult = teamResults.find((tr) => tr.teamId === team.id);
        if (!teamResult)
            continue;
        // Calculate per-member elo change
        // Each member gets the same change as the team
        const memberRatingChange = teamResult.teamRatingChange;
        for (const member of team.members) {
            const memberRatingAfter = member.ratingBefore + memberRatingChange;
            results.push({
                uid: member.uid,
                ratingBefore: member.ratingBefore,
                ratingAfter: memberRatingAfter,
                ratingChange: memberRatingChange
            });
        }
    }
    return results;
}
exports.calculateTeamEloChanges = calculateTeamEloChanges;
//# sourceMappingURL=helpers.js.map