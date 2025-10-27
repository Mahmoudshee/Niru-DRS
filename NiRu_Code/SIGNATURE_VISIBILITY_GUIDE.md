# Signature Visibility Guide

## Overview
This document explains how signature visibility works in the PDF generation system based on user roles and requisition status.

## Signature Visibility Rules

### Staff Signature
**Visible to:**
- ✅ **Admin**: Always visible (can see all signatures)
- ✅ **Staff**: Only their own signature (when `requisition.staffId === currentUserId`)
- ✅ **Authorizer**: Only after authorization (`status === 'authorized'` or `'approved'`)
- ✅ **Approver**: Only after approval (`status === 'approved'`)

### Authorizer Signature
**Visible to:**
- ✅ **Admin**: Always visible (can see all signatures)
- ✅ **Authorizer**: Only their own signature after authorization (`status === 'authorized'` or `'approved'`)
- ✅ **Approver**: Only after approval (`status === 'approved'`)
- ✅ **Staff**: Only after approval (`status === 'approved'`)

### Approver Signature
**Visible to:**
- ✅ **Admin**: Always visible (can see all signatures)
- ✅ **Approver**: Only their own signature after approval (`status === 'approved'`)
- ✅ **Staff**: Only after approval (`status === 'approved'`)
- ✅ **Authorizer**: Only after approval (`status === 'approved'`)

## Status Indicators

### "IN PROGRESS" Display
When a signature is not yet available, the system shows:
- **"IN PROGRESS"** text instead of signature image
- This appears for pending authorization/approval

### "REJECTED" Display
When a requisition is rejected:
- **"REJECTED"** text with rejection date
- No signature image is shown

## Implementation Details

### Function Signature
```typescript
generateRequisitionPDF(
  requisition: Requisition, 
  authoriserName?: string, 
  approverName?: string, 
  currentUserRole?: string, 
  currentUserId?: string
)
```

### Key Parameters
- `currentUserRole`: User's role ('admin', 'staff', 'authoriser', 'approver')
- `currentUserId`: User's ID for ownership checks
- `requisition.status`: Current status ('pending', 'authorized', 'approved', 'rejected')

### Usage Examples

#### Staff Downloading Their Own Requisition
```typescript
// Staff can see their signature immediately
const blob = await generateRequisitionPDF(requisition, undefined, undefined, 'staff', staffUserId);
```

#### Authorizer Downloading Before Authorization
```typescript
// Authorizer sees "IN PROGRESS" for authorizer/approver signatures
const blob = await generateRequisitionPDF(requisition, undefined, undefined, 'authoriser', authorizerUserId);
```

#### Admin Downloading Any Requisition
```typescript
// Admin can see all signatures regardless of status
const blob = await generateRequisitionPDF(requisition, undefined, undefined, 'admin', adminUserId);
```

## Security Features

1. **Role-Based Access**: Users can only see signatures they're authorized to view
2. **Status-Based Visibility**: Signatures are only shown after the appropriate action is taken
3. **Ownership Checks**: Staff can only see their own signatures in pending requisitions
4. **Admin Override**: Admins can see all signatures for oversight purposes

## Testing Scenarios

### Scenario 1: Staff Downloads Pending Requisition
- ✅ Staff signature: Visible
- ❌ Authorizer signature: "IN PROGRESS"
- ❌ Approver signature: "IN PROGRESS"

### Scenario 2: Authorizer Downloads Authorized Requisition
- ✅ Staff signature: Visible
- ✅ Authorizer signature: Visible
- ❌ Approver signature: "IN PROGRESS"

### Scenario 3: Staff Downloads Approved Requisition
- ✅ Staff signature: Visible
- ✅ Authorizer signature: Visible
- ✅ Approver signature: Visible

### Scenario 4: Admin Downloads Any Requisition
- ✅ Staff signature: Always visible
- ✅ Authorizer signature: Always visible (if authorized)
- ✅ Approver signature: Always visible (if approved)

This system ensures proper signature visibility while maintaining security and workflow integrity.
