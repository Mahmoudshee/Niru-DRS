# Signature System - Final Implementation

## Overview
The signature system has been completely redesigned to use the `profiles` table as the single source of truth for signature URLs. This ensures clean, predictable behavior with no automatic deletions.

## Key Principles

### 1. Single Source of Truth
- **Profiles Table**: The `signature_url` field in the `profiles` table is the ONLY source for signature URLs
- **No Storage Scanning**: We no longer scan storage folders for signature files
- **No Automatic Sync**: No automatic syncing between storage and profiles table

### 2. Manual Management Only
- **User Control**: Users must manually upload/delete signatures through the UI
- **No Auto-Deletion**: Signature URLs are never automatically deleted
- **Explicit Actions**: All signature changes require explicit user action

### 3. Clean PDF Generation
- **Direct Fetch**: PDF generation fetches signatures directly from `profiles.signature_url`
- **Reliable**: No dependency on storage file listings or automatic syncing
- **Predictable**: Signatures appear exactly as stored in the profiles table

## Implementation Details

### PDF Generation Flow
```typescript
// 1. Get user name from requisition/audit logs
const userName = "John Doe";

// 2. Fetch signature from profiles table
const { data: profile } = await supabase
  .from('profiles')
  .select('signature_url')
  .ilike('name', userName)
  .single();

// 3. Use signature_url directly
if (profile?.signature_url) {
  // Convert to base64 and embed in PDF
  const response = await fetch(profile.signature_url);
  const blob = await response.blob();
  // ... convert to base64 and add to PDF
}
```

### Signature Upload Flow
```typescript
// 1. User uploads signature file to storage
const { data } = await supabase.storage
  .from('signatures')
  .upload(filePath, file);

// 2. Get public URL
const { data: urlData } = supabase.storage
  .from('signatures')
  .getPublicUrl(filePath);

// 3. Update profiles table with signature_url
await supabase.rpc('update_user_profile', {
  profile_name: currentProfile.name,
  profile_email: currentProfile.email,
  signature_url: urlData.publicUrl
});
```

### Signature Deletion Flow
```typescript
// 1. User deletes signature file from storage
await supabase.storage
  .from('signatures')
  .remove([filePath]);

// 2. Update profiles table to remove signature_url
await supabase.rpc('update_user_profile', {
  profile_name: currentProfile.name,
  profile_email: currentProfile.email,
  signature_url: null
});
```

## Role-Based Signature Visibility

### Staff Signature
- **Staff**: Visible immediately (own signature)
- **Authorizer**: Visible after authorization
- **Approver**: Visible after approval
- **Admin**: Always visible

### Authorizer Signature
- **Authorizer**: Visible after authorization (own signature)
- **Approver**: Visible after approval
- **Staff**: Visible after approval
- **Admin**: Always visible

### Approver Signature
- **Approver**: Visible after approval (own signature)
- **Staff**: Visible after approval
- **Authorizer**: Visible after approval
- **Admin**: Always visible

## Status Indicators

### "IN PROGRESS"
- Shows when signatures are pending
- Replaces signature image with text
- Indicates workflow status

### "REJECTED"
- Shows when requisitions are rejected
- Includes rejection date
- No signature image displayed

## Testing

### Test Signature Fetching
```bash
npm run test-signature-fetch
```
This tests that signatures are properly fetched from the profiles table.

### Test Profile Cleanup
```bash
npm run check-profiles
```
This checks for any profile issues and can clean up orphaned data.

## Benefits

### 1. Reliability
- No dependency on storage file listings
- No race conditions between storage and database
- Predictable signature behavior

### 2. Performance
- Direct database lookup (fast)
- No storage scanning required
- Efficient PDF generation

### 3. User Control
- Users have full control over their signatures
- No unexpected deletions
- Clear workflow for signature management

### 4. Maintainability
- Single source of truth
- Clear data flow
- Easy to debug and troubleshoot

## Migration Notes

### From Old System
- Old storage-based functions have been removed
- All signature fetching now uses profiles table
- No automatic syncing functions are called during PDF generation

### Database Requirements
- Ensure `profiles.signature_url` field exists
- Ensure `update_user_profile` function works correctly
- Run the SQL fixes to ensure proper NULL handling

## Security

### Access Control
- Role-based signature visibility
- Users can only see signatures they're authorized to view
- Admin override for oversight

### Data Integrity
- Signature URLs are validated before use
- Error handling for missing or invalid URLs
- Graceful fallback when signatures are not available

This implementation provides a robust, reliable, and user-controlled signature system that integrates seamlessly with the PDF generation workflow.
