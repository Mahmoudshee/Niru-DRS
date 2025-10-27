#!/usr/bin/env node

/**
 * Profile Checker Script
 * 
 * This script checks for empty profiles and can fix them automatically.
 * Run this periodically to ensure your profiles table stays clean.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('   Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Import the cleanup function (we'll need to implement this in the script)
async function cleanupOrphanedSignatureUrls() {
  try {
    console.log('🧹 Starting cleanup of orphaned signature URLs...');
    
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

        // Check if the file actually exists in storage
        const { data: fileData, error: fileError } = await supabase.storage
          .from('signatures')
          .list(profile.id, {
            search: fileName
          });

        // If file doesn't exist or there's an error, clean up the URL
        if (fileError || !fileData || fileData.length === 0) {
          console.log(`🧹 Cleaning up orphaned signature URL for user ${profile.id}`);
          
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
              console.log(`✅ Successfully cleaned up orphaned signature URL for user ${profile.id}`);
            } else {
              console.error(`❌ Error cleaning up signature URL for user ${profile.id}:`, updateError);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing profile ${profile.id}:`, error);
      }
    }

    console.log(`🧹 Cleanup completed. Cleaned up ${cleanedCount} orphaned signature URLs.`);
    return cleanedCount;
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return 0;
  }
}

async function checkProfiles() {
  console.log('🔍 Checking for empty profiles...\n');
  
  try {
    // Check for empty profiles
    const { data: emptyProfiles, error: checkError } = await supabase
      .rpc('check_empty_profiles');
    
    if (checkError) {
      console.error('❌ Error checking profiles:', checkError.message);
      return;
    }
    
    if (emptyProfiles && emptyProfiles.length > 0) {
      console.log(`⚠️  Found ${emptyProfiles.length} profiles with issues:`);
      emptyProfiles.forEach(profile => {
        console.log(`   - ${profile.profile_id}: name="${profile.profile_name}", email="${profile.profile_email}"`);
      });
      
      console.log('\n🔧 Auto-fixing profiles...');
      
      // Auto-fix the profiles
      const { data: fixedCount, error: fixError } = await supabase
        .rpc('auto_fix_empty_profiles');
      
      if (fixError) {
        console.error('❌ Error fixing profiles:', fixError.message);
        return;
      }
      
      console.log(`✅ Fixed ${fixedCount} profiles!`);
    } else {
      console.log('✅ No empty profiles found! All profiles are clean.');
    }
    
    // Also clean up orphaned signature URLs
    console.log('\n🧹 Checking for orphaned signature URLs...');
    const cleanedCount = await cleanupOrphanedSignatureUrls();
    
    if (cleanedCount > 0) {
      console.log(`✅ Cleaned up ${cleanedCount} orphaned signature URLs!`);
    } else {
      console.log('✅ No orphaned signature URLs found!');
    }
    
  } catch (error) {
    console.error('❌ Exception:', error.message);
  }
}

// Run the check
checkProfiles();
