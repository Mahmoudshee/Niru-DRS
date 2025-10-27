import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SignatureGallery from '@/components/ui/signature-gallery';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { syncUserSignatureUrl } from '@/utils/signatureSync';

export const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user?.id]); // Re-fetch when user ID changes

  const fetchProfile = async () => {
    if (!user) return;

    try {
      // Sync signature URL before fetching profile
      await syncUserSignatureUrl(user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Sync signature URL and update profile in one operation
      const signatureUrl = await syncUserSignatureUrl(user.id);
      
      // Use secure function that prevents role escalation
      const { error } = await supabase.rpc('update_user_profile', {
        profile_name: profile.name.trim(),
        profile_email: profile.email.trim(),
        signature_url: signatureUrl // Pass the synced signature URL
      });

      if (error) throw error;

      toast.success('Profile updated successfully');
      navigate('/'); // This redirects to dashboard
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };


  if (!user) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Manage your account details and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email"
              />
            </div>
          </div>
          
          <Button 
            onClick={handleSaveProfile} 
            disabled={loading}
            className="w-full md:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <SignatureGallery
        userId={user.id}
        userName={profile.name || user.name || 'User'}
      />
    </div>
  );
};