
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/types/requisition';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const handleAuthState = async (session: any) => {
    console.log('handleAuthState called with session:', session?.user?.email);
    
    try {
      if (session?.user) {
        console.log('Session exists, fetching profile for user:', session.user.id);
        
        // Add timeout to profile query to prevent infinite hanging
        const profilePromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile query timeout')), 5000)
        );
        
        try {
          const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as any;
          console.log('Profile query result:', { profile, error });
          
          if (error) {
            console.error('Error fetching profile:', error);
            throw error; // This will trigger the fallback
          }
          
          if (profile) {
            // Use roles array from database
            let userRoles: UserRole[] = [];
            if (Array.isArray(profile.roles)) {
              userRoles = profile.roles as UserRole[];
            } else {
              userRoles = ['staff'];
            }

            const userData: User = {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              roles: userRoles
            };

            console.log('Setting user data from profile:', userData);
            // Save roles to localStorage for fallback use
            localStorage.setItem('userRoles', JSON.stringify(userRoles));
            setUser(userData);
            setLoading(false);
            return;
          }
        } catch (profileError) {
          console.warn('Profile query failed, using session fallback:', profileError);
        }
        
        // Fallback: Try to preserve known roles from localStorage or use session data
        console.log('Using session data as fallback');
        const savedRoles = localStorage.getItem('userRoles');
        let fallbackRoles: UserRole[] = ['staff'];
        
        if (savedRoles) {
          try {
            fallbackRoles = JSON.parse(savedRoles);
            console.log('Using saved roles from localStorage:', fallbackRoles);
          } catch (e) {
            console.warn('Failed to parse saved roles, using default');
          }
        }
        
        const userData: User = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          roles: fallbackRoles
        };
        console.log('Setting fallback user data:', userData);
        setUser(userData);
      } else {
        console.log('No session, clearing user');
        setUser(null);
      }
    } catch (error) {
      console.error('Error handling auth state:', error);
      // Final fallback for any unexpected errors
      if (session?.user) {
        // Try to use saved roles even in emergency fallback
        const savedRoles = localStorage.getItem('userRoles');
        let emergencyRoles: UserRole[] = ['staff'];
        
        if (savedRoles) {
          try {
            emergencyRoles = JSON.parse(savedRoles);
          } catch (e) {
            // Use default if parsing fails
          }
        }
        
        const userData: User = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          roles: emergencyRoles
        };
        console.log('Emergency fallback - using session data:', userData);
        setUser(userData);
      } else {
        setUser(null);
      }
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    let subscription: any = null;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Set up auth state listener
        const { data } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state change:', { event, session: session?.user?.email });
            await handleAuthState(session);
          }
        );
        subscription = data.subscription;

        // Get initial session
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('Initial session:', sessionData.session?.user?.email);
        await handleAuthState(sessionData.session);
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Login attempt for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      console.log('Login successful:', data.user?.email);
      return true;
    } catch (error) {
      console.error('Login exception:', error);
      return false;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Email domain restriction removed - any email address is now allowed
      // if (!email.endsWith('@elimu.ca')) {
      //   return { success: false, error: 'Only @elimu.ca email addresses are allowed to register' };
      // }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      });

      if (error) {
        // Return specific Supabase error messages
        return { success: false, error: error.message };
      }

      // The handle_new_user trigger will automatically create the profile with staff role
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Registration failed' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
