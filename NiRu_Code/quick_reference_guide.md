# Digital Requisition System - Quick Reference Guide

## System URL
[Your System URL Here]

## User Roles Quick Reference

| Role | Primary Function | Key Permissions |
|------|------------------|-----------------|
| **Staff** | Create requisitions | Create, edit, delete own pending requisitions |
| **Authoriser** | First approval level | Authorize/reject pending requisitions |
| **Approver** | Final approval | Approve/reject authorized requisitions |
| **Admin** | System management | All functions, system administration |

## Workflow Overview
```
Staff Creates → Authoriser Reviews → Approver Reviews → Liquidation
   (Pending)       (Authorized)        (Approved)      (Complete)
```

## Quick Actions by Role

### Staff Quick Actions:
1. **Create Requisition**: Dashboard → "Create New Requisition"
2. **Check Status**: View dashboard cards
3. **Edit Pending**: Click edit icon on pending requisitions
4. **Upload Document**: Use file upload in requisition form

### Authoriser Quick Actions:
1. **Authorize**: Click requisition → "Take Action" → Add notes → "Authorize"
2. **Reject**: Click requisition → "Take Action" → Add notes → "Reject"
3. **Download Reports**: Use download buttons on dashboard

### Approver Quick Actions:
1. **Approve**: Click requisition → "Take Action" → Add notes → "Approve"
2. **Reject**: Click requisition → "Take Action" → Add notes → "Reject"
3. **Monitor Budget**: Check approved amounts regularly

### Admin Quick Actions:
1. **Backup Data**: Click "Backup to Google Drive"
2. **Manage Liquidation**: Toggle liquidation status
3. **View Audit Logs**: Access system audit trail
4. **Delete Archived**: Permanently remove old data

## Common Issues & Solutions

### Cannot Create Requisition
**Problem**: "Cannot Create Requisition" message appears
**Solution**: You have unliquidated approved requisitions. Contact admin to mark them as liquidated.

### Upload Fails
**Problem**: Document won't upload
**Solutions**: 
- Check file size (max 5MB)
- Use supported formats: PDF, DOC, DOCX, JPG, PNG
- Try different browser

### Login Issues
**Problem**: Cannot log in
**Solutions**:
- Verify email and password
- Check caps lock
- Contact admin for password reset

### Dashboard Not Loading
**Problem**: Dashboard appears blank or incomplete
**Solutions**:
- Refresh page (F5)
- Clear browser cache
- Try different browser

## Essential Keyboard Shortcuts
- **F5**: Refresh page
- **Ctrl+F**: Find text on page
- **Ctrl+S**: Save (in forms)
- **Tab**: Navigate between form fields
- **Enter**: Submit forms

## File Upload Requirements
- **Maximum Size**: 5MB
- **Supported Formats**: PDF, DOC, DOCX, JPG, JPEG, PNG
- **Recommended**: PDF for official documents
- **Signature Files**: PNG, JPG (max 2MB)

## Status Definitions
- **Pending**: Waiting for authoriser review
- **Authorized**: Approved by authoriser, waiting for approver
- **Approved**: Final approval given, ready for liquidation
- **Rejected**: Denied at any stage
- **Liquidated**: Funds accounted for and process complete

## Contact Information
- **System Administrator**: [Contact Details]
- **Technical Support**: [Contact Details]
- **Training Questions**: [Contact Details]

## Emergency Procedures
1. **System Down**: Contact IT support immediately
2. **Data Loss**: Contact administrator (backups available)
3. **Security Concern**: Log out immediately, contact admin
4. **Urgent Approval Needed**: Contact relevant approver directly

## Browser Recommendations
- **Primary**: Google Chrome (latest version)
- **Alternative**: Mozilla Firefox, Microsoft Edge
- **Mobile**: Use desktop version when possible
- **Compatibility**: Avoid Internet Explorer

## Training Resources
- **Full Manual**: [Reference to complete manual]
- **Video Tutorials**: [If available]
- **Practice Environment**: [If available]
- **Help System**: Built into application

---

*Print this guide for easy reference during system use*