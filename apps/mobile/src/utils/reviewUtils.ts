import AsyncStorage from '@react-native-async-storage/async-storage';

const REVIEW_STATUS_KEY = '@elohero:review_status';
const REVIEW_DECLINED_KEY = '@elohero:review_declined';

interface ReviewStatus {
  hasReviewed: boolean;
  declinedAt?: number;
}

/**
 * Check if user has already reviewed the app
 */
export async function hasUserReviewed(): Promise<boolean> {
  try {
    const statusJson = await AsyncStorage.getItem(REVIEW_STATUS_KEY);
    if (!statusJson) {
      return false;
    }
    const status: ReviewStatus = JSON.parse(statusJson);
    return status.hasReviewed === true;
  } catch (error) {
    console.error('Error checking review status:', error);
    return false;
  }
}

/**
 * Mark that user has reviewed the app
 */
export async function markUserAsReviewed(): Promise<void> {
  try {
    const status: ReviewStatus = {
      hasReviewed: true
    };
    await AsyncStorage.setItem(REVIEW_STATUS_KEY, JSON.stringify(status));
  } catch (error) {
    console.error('Error marking user as reviewed:', error);
  }
}

/**
 * Check if user has declined to review (and we should wait before asking again)
 */
export async function hasUserDeclinedReview(): Promise<boolean> {
  try {
    const declinedAt = await AsyncStorage.getItem(REVIEW_DECLINED_KEY);
    if (!declinedAt) {
      return false;
    }
    const declinedTimestamp = Number.parseInt(declinedAt, 10);
    const now = Date.now();
    const daysSinceDeclined = (now - declinedTimestamp) / (1000 * 60 * 60 * 24);

    // Ask again after 30 days
    return daysSinceDeclined < 30;
  } catch (error) {
    console.error('Error checking declined review status:', error);
    return false;
  }
}

/**
 * Mark that user has declined to review
 */
export async function markUserDeclinedReview(): Promise<void> {
  try {
    await AsyncStorage.setItem(REVIEW_DECLINED_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error marking user as declined review:', error);
  }
}

/**
 * Check if user is eligible for review prompt
 * Returns true if user hasn't reviewed and hasn't declined recently
 */
export async function isEligibleForReview(): Promise<boolean> {
  const hasReviewed = await hasUserReviewed();
  if (hasReviewed) {
    return false;
  }

  const hasDeclined = await hasUserDeclinedReview();
  return !hasDeclined;
}
