import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface UserProfile {
    id: string;
    full_name: string;
    role: string;
    company_id: string;
    companies?: {
        name: string;
    } | null;
}

interface UserProfileContextData {
    profile: UserProfile | null;
    loading: boolean;
    refetch: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextData>({} as UserProfileContextData);

export function UserProfileProvider({ children }: { children: ReactNode }) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const hasFetched = useRef(false);

    const fetchProfile = async (force = false) => {
        // Se já buscou e não está forçando, não busca novamente
        if (hasFetched.current && !force) {
            setLoading(false);
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setProfile(null);
                setLoading(false);
                hasFetched.current = true;
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*, companies(name)')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
            } else if (data) {
                setProfile(data as UserProfile);
            }
            hasFetched.current = true;
        } catch (error) {
            console.error('Error in profile context:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();

        // Listen for auth changes to re-fetch or clear
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                setLoading(true);
                hasFetched.current = false; // Reset flag para forçar novo fetch
                fetchProfile(true);
            } else if (event === 'SIGNED_OUT') {
                setProfile(null);
                setLoading(false);
                hasFetched.current = false;
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <UserProfileContext.Provider value={{ profile, loading, refetch: () => fetchProfile(true) }}>
            {children}
        </UserProfileContext.Provider>
    );
}

export function useUserProfileContext() {
    return useContext(UserProfileContext);
}
