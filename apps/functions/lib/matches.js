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
exports.deleteMatch = exports.reportMatch = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db_1 = require("./utils/db");
const constants_1 = require("./utils/constants");
const helpers_1 = require("./utils/helpers");
// 4. Report Match Function
exports.reportMatch = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { groupId, seasonId, participants, teams } = data;
    const uid = context.auth.uid;
    if (!groupId || !seasonId) {
        throw new functions.https.HttpsError('invalid-argument', 'Group ID and season ID are required');
    }
    const isTeamMode = teams && Array.isArray(teams) && teams.length > 0;
    let teamInputs = [];
    if (isTeamMode) {
        if (teams.length < 2) {
            throw new functions.https.HttpsError('invalid-argument', 'At least 2 teams are required');
        }
        // Validate each team has at least one member
        for (const team of teams) {
            if (!team.members || !Array.isArray(team.members) || team.members.length === 0) {
                throw new functions.https.HttpsError('invalid-argument', 'Each team must have at least one member');
            }
        }
    }
    else {
        if (!participants || !Array.isArray(participants)) {
            throw new functions.https.HttpsError('invalid-argument', 'Participants are required');
        }
        if (participants.length < 2) {
            throw new functions.https.HttpsError('invalid-argument', 'At least 2 participants are required');
        }
    }
    try {
        // Verify user is a member of the group (composite membership id)
        const memberDoc = await db_1.db.collection('members').doc(`${uid}_${groupId}`).get();
        if (!memberDoc.exists) {
            throw new functions.https.HttpsError('permission-denied', 'You are not a member of this group');
        }
        let eloResults = [];
        if (isTeamMode) {
            // Team mode: Calculate team elo changes
            teamInputs = teams;
            // Get all unique member UIDs from all teams
            const allMemberUids = new Set();
            teamInputs.forEach((team) => {
                team.members.forEach((member) => {
                    allMemberUids.add(member.uid);
                });
            });
            // Get current ratings for all team members
            const ratingsPromises = Array.from(allMemberUids).map((memberUid) => db_1.db.collection('ratings').doc(`${seasonId}_${memberUid}`).get());
            const ratingDocs = await Promise.all(ratingsPromises);
            const ratingMap = new Map();
            ratingDocs.forEach((doc, index) => {
                const memberUid = Array.from(allMemberUids)[index];
                const ratingData = doc.exists ? doc.data() : null;
                ratingMap.set(memberUid, {
                    currentRating: (ratingData === null || ratingData === void 0 ? void 0 : ratingData.currentRating) || constants_1.ELO_CONFIG.RATING_INIT,
                    gamesPlayed: (ratingData === null || ratingData === void 0 ? void 0 : ratingData.gamesPlayed) || 0
                });
            });
            // Prepare teams with ratings
            const teamsWithRatings = teamInputs.map((team) => {
                const teamMembers = team.members.map((member) => {
                    const rating = ratingMap.get(member.uid);
                    return {
                        uid: member.uid,
                        ratingBefore: rating.currentRating,
                        gamesPlayed: rating.gamesPlayed
                    };
                });
                // Calculate team rating as average of member ratings
                const teamRating = teamMembers.length > 0
                    ? teamMembers.reduce((sum, m) => sum + m.ratingBefore, 0) / teamMembers.length
                    : constants_1.ELO_CONFIG.RATING_INIT;
                return {
                    id: team.id,
                    members: teamMembers,
                    placement: team.placement,
                    isTied: team.isTied || false,
                    teamRating
                };
            });
            // Calculate team elo changes
            const teamEloResults = (0, helpers_1.calculateTeamEloChanges)(teamsWithRatings);
            // Map team elo results back to participants with team info
            eloResults = teamEloResults.map((result) => {
                // Find which team this member belongs to
                const team = teamInputs.find((t) => t.members.some((m) => m.uid === result.uid));
                const teamMember = team === null || team === void 0 ? void 0 : team.members.find((m) => m.uid === result.uid);
                return {
                    uid: result.uid,
                    displayName: (teamMember === null || teamMember === void 0 ? void 0 : teamMember.displayName) || '',
                    photoURL: (teamMember === null || teamMember === void 0 ? void 0 : teamMember.photoURL) || null,
                    placement: (team === null || team === void 0 ? void 0 : team.placement) || 1,
                    isTied: (team === null || team === void 0 ? void 0 : team.isTied) || false,
                    ratingBefore: result.ratingBefore,
                    ratingAfter: result.ratingAfter,
                    ratingChange: result.ratingChange,
                    teamId: team === null || team === void 0 ? void 0 : team.id
                };
            });
        }
        else {
            // Individual mode: Use existing logic
            const participantsArray = participants;
            // Get current ratings for all participants
            const ratingsPromises = participantsArray.map((p) => db_1.db.collection('ratings').doc(`${seasonId}_${p.uid}`).get());
            const ratingDocs = await Promise.all(ratingsPromises);
            // Prepare participants with current ratings
            const participantsWithRatings = participantsArray.map((p, index) => {
                const ratingDoc = ratingDocs[index];
                const ratingData = ratingDoc.exists ? ratingDoc.data() : null;
                return {
                    uid: p.uid,
                    displayName: p.displayName,
                    photoURL: p.photoURL,
                    placement: p.placement,
                    isTied: p.isTied || false,
                    ratingBefore: (ratingData === null || ratingData === void 0 ? void 0 : ratingData.currentRating) || constants_1.ELO_CONFIG.RATING_INIT,
                    gamesPlayed: (ratingData === null || ratingData === void 0 ? void 0 : ratingData.gamesPlayed) || 0
                };
            });
            // Calculate ELO changes
            const individualResults = (0, helpers_1.calculateEloChanges)(participantsWithRatings);
            eloResults = individualResults.map((result) => {
                const participant = participantsArray.find((p) => p.uid === result.uid);
                return {
                    uid: result.uid,
                    displayName: (participant === null || participant === void 0 ? void 0 : participant.displayName) || '',
                    photoURL: (participant === null || participant === void 0 ? void 0 : participant.photoURL) || null,
                    placement: result.placement,
                    isTied: result.isTied || false,
                    ratingBefore: result.ratingBefore,
                    ratingAfter: result.ratingAfter,
                    ratingChange: result.ratingChange
                };
            });
        }
        // Create game document
        const gameRef = db_1.db.collection('games').doc();
        const gameData = {
            id: gameRef.id,
            groupId,
            seasonId,
            createdBy: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            gameType: isTeamMode ? 'teams' : 'multiplayer',
            status: 'completed'
        };
        await gameRef.set(gameData);
        // Get all current rating documents before batch operations
        const ratingDocPromises = eloResults.map((result) => db_1.db.collection('ratings').doc(`${seasonId}_${result.uid}`).get());
        const allRatingDocs = await Promise.all(ratingDocPromises);
        const ratingDataMap = new Map();
        eloResults.forEach((result, index) => {
            const ratingDoc = allRatingDocs[index];
            ratingDataMap.set(result.uid, ratingDoc.exists ? ratingDoc.data() : undefined);
        });
        // Update participants and ratings in a batch
        const batch = db_1.db.batch();
        // Add participants
        eloResults.forEach((result) => {
            const participantRef = db_1.db.collection('participants').doc(`${gameRef.id}_${result.uid}`);
            const participantData = {
                uid: result.uid,
                gameId: gameRef.id,
                displayName: result.displayName,
                photoURL: result.photoURL,
                placement: result.placement,
                isTied: result.isTied,
                ratingBefore: result.ratingBefore,
                ratingAfter: result.ratingAfter,
                ratingChange: result.ratingChange
            };
            if (result.teamId) {
                participantData.teamId = result.teamId;
                const team = teamInputs.find((t) => t.id === result.teamId);
                if (team === null || team === void 0 ? void 0 : team.name) {
                    participantData.teamName = team.name;
                }
            }
            batch.set(participantRef, participantData);
            // Update rating
            const ratingRef = db_1.db.collection('ratings').doc(`${seasonId}_${result.uid}`);
            let isWin = false;
            let isLoss = false;
            const isDraw = result.isTied;
            if (isTeamMode) {
                // In team mode, win/loss is based on team placement
                const teamPlacements = teams.map((t) => t.placement);
                const maxPlacement = Math.max(...teamPlacements);
                isWin = result.placement === 1;
                isLoss = result.placement === maxPlacement;
            }
            else {
                // In individual mode, win/loss is based on participant placement
                const totalParticipants = participants.length;
                isWin = result.placement === 1;
                isLoss = result.placement === totalParticipants;
            }
            // Get current rating data for this participant from the map
            const currentRatingData = ratingDataMap.get(result.uid);
            const currentGamesPlayed = (currentRatingData === null || currentRatingData === void 0 ? void 0 : currentRatingData.gamesPlayed) || 0;
            batch.set(ratingRef, {
                id: `${seasonId}_${result.uid}`,
                seasonId,
                uid: result.uid,
                groupId,
                currentRating: result.ratingAfter,
                gamesPlayed: currentGamesPlayed + 1,
                wins: ((currentRatingData === null || currentRatingData === void 0 ? void 0 : currentRatingData.wins) || 0) + (isWin ? 1 : 0),
                losses: ((currentRatingData === null || currentRatingData === void 0 ? void 0 : currentRatingData.losses) || 0) + (isLoss ? 1 : 0),
                draws: ((currentRatingData === null || currentRatingData === void 0 ? void 0 : currentRatingData.draws) || 0) + (isDraw ? 1 : 0),
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            // Add rating change record
            const ratingChangeRef = db_1.db.collection('ratingChanges').doc(`${gameRef.id}_${result.uid}`);
            batch.set(ratingChangeRef, {
                id: `${gameRef.id}_${result.uid}`,
                gameId: gameRef.id,
                uid: result.uid,
                seasonId,
                groupId,
                ratingBefore: result.ratingBefore,
                ratingAfter: result.ratingAfter,
                ratingChange: result.ratingChange,
                placement: result.placement,
                isTied: result.isTied,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        // Update group and season game counts
        batch.update(db_1.db.collection('groups').doc(groupId), {
            gameCount: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        batch.update(db_1.db.collection('seasons').doc(seasonId), {
            gameCount: admin.firestore.FieldValue.increment(1)
        });
        await batch.commit();
        return {
            success: true,
            data: {
                game: gameData,
                participants: eloResults
            }
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to report match');
    }
});
// 5. Delete Match Function (Soft Delete)
exports.deleteMatch = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { gameId } = data;
    const uid = context.auth.uid;
    if (!gameId) {
        throw new functions.https.HttpsError('invalid-argument', 'Game ID is required');
    }
    try {
        // Get game document
        const gameDoc = await db_1.db.collection('games').doc(gameId).get();
        if (!gameDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Game not found');
        }
        const gameData = gameDoc.data();
        // Check if game is already deleted
        if (gameData.deletedAt) {
            throw new functions.https.HttpsError('failed-precondition', 'Game is already deleted');
        }
        const { groupId, seasonId, createdBy } = gameData;
        // Verify user is a member of the group
        const memberDoc = await db_1.db.collection('members').doc(`${uid}_${groupId}`).get();
        if (!memberDoc.exists) {
            throw new functions.https.HttpsError('permission-denied', 'You are not a member of this group');
        }
        // Only allow deletion by group owner or match creator
        const groupDoc = await db_1.db.collection('groups').doc(groupId).get();
        if (!groupDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Group not found');
        }
        const groupData = groupDoc.data();
        const isOwner = groupData.ownerId === uid;
        const isCreator = createdBy === uid;
        if (!isOwner && !isCreator) {
            throw new functions.https.HttpsError('permission-denied', 'Only group owner or match creator can delete the match');
        }
        // Get all participants for this game
        const participantsSnapshot = await db_1.db
            .collection('participants')
            .where('gameId', '==', gameId)
            .get();
        if (participantsSnapshot.empty) {
            throw new functions.https.HttpsError('not-found', 'No participants found for this game');
        }
        const participants = participantsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                uid: data.uid,
                ratingChange: data.ratingChange,
                placement: data.placement,
                isTied: data.isTied
            };
        });
        // Get current ratings for all participants
        const ratingPromises = participants.map((p) => db_1.db.collection('ratings').doc(`${seasonId}_${p.uid}`).get());
        const ratingDocs = await Promise.all(ratingPromises);
        // Create batch for all updates
        const batch = db_1.db.batch();
        // Reverse rating changes for each participant
        participants.forEach((participant, index) => {
            const ratingDoc = ratingDocs[index];
            if (!ratingDoc.exists) {
                // If rating doesn't exist, skip (shouldn't happen but handle gracefully)
                return;
            }
            const ratingData = ratingDoc.data();
            const ratingRef = ratingDoc.ref;
            // Calculate reversed values
            const newRating = ratingData.currentRating - participant.ratingChange;
            const newGamesPlayed = Math.max(0, ratingData.gamesPlayed - 1);
            // Determine if this was a win, loss, or draw
            const totalParticipants = participants.length;
            const wasWin = participant.placement === 1;
            const wasLoss = participant.placement === totalParticipants;
            const wasDraw = participant.isTied;
            // Update rating with reversed values
            batch.set(ratingRef, {
                id: `${seasonId}_${participant.uid}`,
                seasonId,
                uid: participant.uid,
                groupId,
                currentRating: newRating,
                gamesPlayed: newGamesPlayed,
                wins: Math.max(0, ratingData.wins - (wasWin ? 1 : 0)),
                losses: Math.max(0, ratingData.losses - (wasLoss ? 1 : 0)),
                draws: Math.max(0, ratingData.draws - (wasDraw ? 1 : 0)),
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        });
        // Mark game as deleted (soft delete)
        batch.update(db_1.db.collection('games').doc(gameId), {
            deletedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Decrement game counts
        batch.update(db_1.db.collection('groups').doc(groupId), {
            gameCount: admin.firestore.FieldValue.increment(-1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        batch.update(db_1.db.collection('seasons').doc(seasonId), {
            gameCount: admin.firestore.FieldValue.increment(-1)
        });
        await batch.commit();
        return {
            success: true,
            message: 'Match deleted successfully'
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to delete match');
    }
});
//# sourceMappingURL=matches.js.map