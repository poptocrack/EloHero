/**
 * Script to set admin custom claim on a Firebase user
 * 
 * Usage:
 *   npx ts-node apps/functions/src/utils/setAdminClaim.ts <user-email-or-uid>
 * 
 * Or compile and run:
 *   cd apps/functions
 *   yarn build
 *   node lib/utils/setAdminClaim.js <user-email-or-uid>
 */

import * as admin from 'firebase-admin';
import { admin as adminInstance } from './admin';

async function setAdminClaim(userIdentifier: string): Promise<void> {
  try {
    let userRecord: admin.auth.UserRecord;

    // Try to get user by email first, then by UID
    if (userIdentifier.includes('@')) {
      userRecord = await adminInstance.auth().getUserByEmail(userIdentifier);
    } else {
      userRecord = await adminInstance.auth().getUser(userIdentifier);
    }

    // Set admin custom claim
    await adminInstance.auth().setCustomUserClaims(userRecord.uid, {
      ...userRecord.customClaims,
      admin: true,
    });

    console.log(`✅ Successfully set admin claim for user: ${userRecord.email || userRecord.uid}`);
    console.log(`   User UID: ${userRecord.uid}`);
    console.log(`   Note: User may need to sign out and sign back in for the claim to take effect.`);
  } catch (error) {
    console.error('❌ Error setting admin claim:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const userIdentifier = process.argv[2];
  
  if (!userIdentifier) {
    console.error('❌ Please provide a user email or UID');
    console.error('Usage: npx ts-node setAdminClaim.ts <user-email-or-uid>');
    process.exit(1);
  }

  setAdminClaim(userIdentifier)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { setAdminClaim };

