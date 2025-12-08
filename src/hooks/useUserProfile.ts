import { useUserProfileContext, type UserProfile } from '../contexts/UserProfileContext';

export type { UserProfile };

export function useUserProfile() {
    return useUserProfileContext();
}
