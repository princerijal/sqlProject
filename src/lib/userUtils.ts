import type { UserProfile } from './database.types';

/**
 * Formats a user's display name, handling deleted users appropriately
 * @param user - The user profile object
 * @param fallback - What to show if user is null
 * @returns Formatted display name
 */
export function formatUserName(
  user: UserProfile | null | undefined,
  fallback: string = 'Deleted User'
): string {
  if (!user) return fallback;

  if (user.deleted_at) {
    return 'Deleted User';
  }

  return user.full_name;
}

/**
 * Formats a user name from either a user object or a stored name string
 * Useful when working with queries that store user names for audit purposes
 * @param user - The user profile object
 * @param storedName - The stored name from the database
 * @param fallback - What to show if both are null
 * @returns Formatted display name
 */
export function formatUserNameOrStored(
  user: UserProfile | null | undefined,
  storedName: string | null | undefined,
  fallback: string = 'Deleted User'
): string {
  if (user && !user.deleted_at) {
    return user.full_name;
  }

  if (storedName) {
    return storedName;
  }

  return fallback;
}

/**
 * Checks if a user is active (not deleted)
 * @param user - The user profile object
 * @returns true if user is active, false otherwise
 */
export function isActiveUser(user: UserProfile | null | undefined): boolean {
  return user ? !user.deleted_at : false;
}

/**
 * Filters a list of users to only include active users
 * @param users - Array of user profiles
 * @returns Array of active users only
 */
export function filterActiveUsers(users: UserProfile[]): UserProfile[] {
  return users.filter(user => !user.deleted_at);
}
