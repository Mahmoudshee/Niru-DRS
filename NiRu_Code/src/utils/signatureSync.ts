import { supabase } from '@/integrations/supabase/client';

// IMPORTANT: This function should only be used for manual cleanup, not automatic syncing
// The profiles table signature_url field is the single source of truth for signatures
// Users must manually manage their signatures through the UI
export const syncUserSignatureUrl = async (userId: string): Promise<string | null> => {
  try {
    console.log(`Syncing signature URL for user ${userId}...`);
    
    // Get all files in user's signature folder
    const { data: files, error: filesError } = await supabase.storage
      .from('signatures')
      .list(userId, {
        limit: 100,
        offset: 0
      });

    let signatureUrl: string | null = null;

    if (filesError) {
      console.error('Error listing signature files:', filesError);
      // If there's an error listing files, assume no signatures exist
      signatureUrl = null;
    } else if (files && files.length > 0) {
      // Get the most recent signature file
      const mostRecent = files
        .filter(file => file.name.includes('signature'))
        .sort((a, b) => 
          new Date(b.updated_at || b.created_at || '').getTime() - 
          new Date(a.updated_at || a.created_at || '').getTime()
        )[0];

      if (mostRecent) {
        // Generate public URL for the file
        const { data: urlData } = supabase.storage
          .from('signatures')
          .getPublicUrl(`${userId}/${mostRecent.name}`);
        
        signatureUrl = urlData.publicUrl;
        console.log(`Found signature file: ${mostRecent.name}`);
      } else {
        console.log('No signature files found in user folder');
        signatureUrl = null;
      }
    } else {
      console.log('No files found in user signature folder');
      signatureUrl = null;
    }

    // Get the current profile data to preserve name and email
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('name, email, signature_url')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching current profile:', fetchError);
      return null;
    }

    console.log(`Current profile signature_url: ${currentProfile.signature_url}`);
    console.log(`New signature_url to set: ${signatureUrl}`);

    // Only update if the signature URL has actually changed
    if (currentProfile.signature_url !== signatureUrl) {
      // Use the RPC function to update signature URL while preserving other data
      const { error: updateError } = await supabase.rpc('update_user_profile', {
        profile_name: currentProfile.name,
        profile_email: currentProfile.email,
        signature_url: signatureUrl
      });

      if (updateError) {
        console.error('Error updating signature URL in profile:', updateError);
        return null;
      }

      console.log(`Successfully updated signature URL for user ${userId}: ${signatureUrl}`);
    } else {
      console.log(`Signature URL unchanged for user ${userId}: ${signatureUrl}`);
    }

    return signatureUrl;
  } catch (error) {
    console.error('Error syncing signature URL:', error);
    return null;
  }
};

// Function to sync all users' signature URLs
export const syncAllSignatureUrls = async (): Promise<void> => {
  try {
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id');

    if (profilesError || !profiles) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }

    // Sync each user's signature URL
    for (const profile of profiles) {
      await syncUserSignatureUrl(profile.id);
    }

    console.log('Synced signature URLs for all users');
  } catch (error) {
    console.error('Error syncing all signature URLs:', error);
  }
};

// Function to clean up orphaned signature URLs (URLs that point to non-existent files)
export const cleanupOrphanedSignatureUrls = async (): Promise<number> => {
  try {
    console.log('Starting cleanup of orphaned signature URLs...');
    
    // Get all profiles with signature URLs
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, signature_url')
      .not('signature_url', 'is', null);

    if (profilesError || !profiles) {
      console.error('Error fetching profiles:', profilesError);
      return 0;
    }

    let cleanedCount = 0;

    for (const profile of profiles) {
      if (!profile.signature_url) continue;

      try {
        // Extract the file path from the URL
        const urlParts = profile.signature_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `${profile.id}/${fileName}`;

        // Check if the file actually exists in storage
        const { data: fileData, error: fileError } = await supabase.storage
          .from('signatures')
          .list(profile.id, {
            search: fileName
          });

        // If file doesn't exist or there's an error, clean up the URL
        if (fileError || !fileData || fileData.length === 0) {
          console.log(`Cleaning up orphaned signature URL for user ${profile.id}: ${profile.signature_url}`);
          
          // Get current profile data
          const { data: currentProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', profile.id)
            .single();

          if (!fetchError && currentProfile) {
            // Update profile to remove the orphaned signature URL
            const { error: updateError } = await supabase.rpc('update_user_profile', {
              profile_name: currentProfile.name,
              profile_email: currentProfile.email,
              signature_url: null
            });

            if (!updateError) {
              cleanedCount++;
              console.log(`Successfully cleaned up orphaned signature URL for user ${profile.id}`);
            } else {
              console.error(`Error cleaning up signature URL for user ${profile.id}:`, updateError);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing profile ${profile.id}:`, error);
      }
    }

    console.log(`Cleanup completed. Cleaned up ${cleanedCount} orphaned signature URLs.`);
    return cleanedCount;
  } catch (error) {
    console.error('Error during cleanup:', error);
    return 0;
  }
};