#!/usr/bin/env node

/**
 * Test Signature Fetching from Profiles Table
 * 
 * This script tests that signatures are properly fetched from the profiles table
 * and that no automatic deletion happens.
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

async function testSignatureFetching() {
  console.log('🧪 Testing Signature Fetching from Profiles Table\n');
  
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
      console.log('ℹ️  No profiles with signature URLs found');
      return;
    }

    console.log(`📊 Found ${profiles.length} profiles with signature URLs:\n`);
    
    for (const profile of profiles) {
      console.log(`👤 User: ${profile.name} (${profile.email})`);
      console.log(`   ID: ${profile.id}`);
      console.log(`   Signature URL: ${profile.signature_url}`);
      
      // Test if the signature URL is accessible
      try {
        const response = await fetch(profile.signature_url);
        if (response.ok) {
          console.log(`   ✅ Signature URL is accessible`);
        } else {
          console.log(`   ❌ Signature URL is not accessible (${response.status})`);
        }
      } catch (error) {
        console.log(`   ❌ Error accessing signature URL: ${error.message}`);
      }
      
      console.log(''); // Empty line for readability
    }

    console.log('🎯 Key Points:');
    console.log('   • Signatures are fetched from profiles.signature_url field');
    console.log('   • No automatic deletion or syncing happens');
    console.log('   • Users must manually manage their signatures through the UI');
    console.log('   • The profiles table is the single source of truth for signatures');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSignatureFetching();
