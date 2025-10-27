#!/usr/bin/env node

/**
 * Test Signature Sync Functionality
 * 
 * This script tests the signature sync functionality to ensure
 * that when signatures are deleted, the profile table is updated correctly.
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

async function testSignatureSync() {
  console.log('🧪 Testing Signature Sync Functionality\n');
  
  try {
    // Get all profiles with signature URLs
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, signature_url')
      .not('signature_url', 'is', null);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('ℹ️  No profiles with signature URLs found to test');
      return;
    }

    console.log(`📊 Found ${profiles.length} profiles with signature URLs:`);
    
    for (const profile of profiles) {
      console.log(`\n👤 User: ${profile.name} (${profile.email})`);
      console.log(`   Profile signature_url: ${profile.signature_url}`);
      
      // Check if the signature file actually exists in storage
      const urlParts = profile.signature_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      const { data: files, error: filesError } = await supabase.storage
        .from('signatures')
        .list(profile.id, {
          search: fileName
        });

      if (filesError) {
        console.log(`   ❌ Error checking storage: ${filesError.message}`);
      } else if (!files || files.length === 0) {
        console.log(`   ⚠️  ORPHANED: Signature URL exists in profile but file not found in storage`);
        console.log(`   🔧 This should be cleaned up by the sync function`);
      } else {
        console.log(`   ✅ File exists in storage: ${files[0].name}`);
      }
    }

    console.log('\n🧪 Test completed!');
    console.log('\n💡 If you see any ORPHANED entries above, run:');
    console.log('   npm run check-profiles');
    console.log('   This will clean up orphaned signature URLs automatically.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSignatureSync();
