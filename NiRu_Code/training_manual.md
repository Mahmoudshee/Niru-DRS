# Digital Requisition System - User Training Manual

## Table of Contents
1. [System Overview](#system-overview)
2. [Getting Started](#getting-started)
3. [User Roles and Permissions](#user-roles-and-permissions)
4. [Login and Registration](#login-and-registration)
5. [Dashboard Navigation](#dashboard-navigation)
6. [Creating Requisitions (Staff)](#creating-requisitions-staff)
7. [Authorizing Requisitions (Authoriser)](#authorizing-requisitions-authoriser)
8. [Approving Requisitions (Approver)](#approving-requisitions-approver)
9. [Administrative Functions (Admin)](#administrative-functions-admin)
10. [Profile Management](#profile-management)
11. [Digital Signatures](#digital-signatures)
12. [Liquidation Process](#liquidation-process)
13. [Document Management](#document-management)
14. [Reports and Downloads](#reports-and-downloads)
15. [Troubleshooting](#troubleshooting)
16. [Best Practices](#best-practices)

---

## System Overview

The Digital Requisition System is a comprehensive platform designed for Elimu Canada to streamline the requisition approval process. The system manages the complete workflow from requisition creation to final approval and liquidation tracking.

### Key Features:
- **Multi-role access control** with four distinct user types
- **Automated workflow** from pending to approved status
- **Digital signature integration** for secure approvals
- **Document attachment** support for requisitions
- **Real-time notifications** and status updates
- **Comprehensive reporting** and audit trails
- **PDF generation** for official documentation
- **Liquidation tracking** for approved requisitions

### System Benefits:
- Eliminates paper-based processes
- Provides clear audit trails
- Ensures proper authorization hierarchy
- Reduces processing time
- Improves accountability and transparency

---

## Getting Started

### System Requirements:
- **Internet Connection**: Required for all functionality
- **Web Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **Email Access**: Required for notifications and password reset

### Initial Setup:
1. Obtain system access from your administrator
2. Use the provided login credentials
3. Set up your profile and digital signature
4. Familiarize yourself with your dashboard

---

## User Roles and Permissions

The system has four distinct user roles, each with specific permissions and responsibilities:

### 1. Staff
**Primary Function**: Create and submit requisitions

**Permissions**:
- Create new requisitions
- View own requisitions
- Edit pending requisitions
- Delete pending requisitions
- Upload supporting documents
- Track requisition status

**Limitations**:
- Cannot create new requisitions while having unliquidated approved requisitions
- Cannot edit approved or processed requisitions

### 2. Authoriser
**Primary Function**: Review and authorize staff requisitions

**Permissions**:
- View all pending requisitions
- Authorize or reject requisitions
- Add authorization notes
- View authorized, approved, and rejected requisitions
- Download requisition reports

**Limitations**:
- Cannot approve requisitions (only authorize)
- Cannot edit requisitions

### 3. Approver
**Primary Function**: Final approval of authorized requisitions

**Permissions**:
- View all authorized requisitions
- Approve or reject authorized requisitions
- Add approval notes
- View approved and rejected requisitions
- Download requisition reports

**Limitations**:
- Cannot authorize pending requisitions
- Can only act on authorized requisitions

### 4. Admin
**Primary Function**: System administration and oversight

**Permissions**:
- Access all system functions
- View all requisitions regardless of status
- Permanently delete archived requisitions
- Manage liquidation status
- Access audit logs
- Backup system data
- Download comprehensive reports

**Special Capabilities**:
- Database management
- User role oversight
- System backup and restore

### Multi-Role Users
Users can have multiple roles and switch between dashboard views:
- Role switcher dropdown appears for multi-role users
- Role-specific permissions apply based on current view
- Help system explains available roles

---

## Login and Registration

### Logging In:
1. Navigate to the system URL
2. Enter your registered email address
3. Enter your password
4. Click "Login"
5. You'll be redirected to your appropriate dashboard

### Staff Registration:
1. Click "Register as Staff Member" on the login page
2. Fill out the registration form:
   - Full Name
   - Valid email address (must be authorized domain)
   - Secure password
   - Confirm password
3. Upload your digital signature (optional but recommended)
4. Submit registration
5. Wait for account approval from administrator

### Password Reset:
1. Contact system administrator for password reset
2. Use the reset link provided
3. Create a new secure password

---

## Dashboard Navigation

### Header Section:
- **Company Logo**: Elimu Canada branding
- **System Title**: Digital Requisition System
- **Role Badges**: Shows your current roles
- **Welcome Message**: Displays your name
- **Profile Button**: Access profile settings
- **Logout Button**: Securely exit the system

### Role Switcher (Multi-role users):
- Dropdown menu to switch between role views
- Help button to explain role functions
- Automatic role detection and priority

### Dashboard Sections:
- **Statistics Cards**: Summary of requisition counts
- **Action Buttons**: Role-specific actions
- **Requisition Lists**: Filtered by role and status
- **Quick Actions**: Download, hide, or manage items

---

## Creating Requisitions (Staff)

### Before You Start:
- Ensure you have no unliquidated approved requisitions
- Gather all necessary information and documents
- Verify budget approval for requested items

### Step-by-Step Process:

#### 1. Access Requisition Form:
- Click "Create New Requisition" on your dashboard
- The form opens in a dialog window

#### 2. Fill Basic Information:
- **Date**: Select the requisition date (defaults to today)
- **Activity**: Describe the purpose (e.g., "Office Supplies Purchase")

#### 3. Add Items:
For each item in your requisition:
- **Description**: Detailed item description
- **Quantity**: Number of items needed
- **Unit Price**: Cost per item in KSH
- **Total Price**: Automatically calculated

**Adding Multiple Items**:
- Click "Add Item" to add more rows
- Use the trash icon to remove unnecessary items
- Minimum one item required

#### 4. Review Total Amount:
- System automatically calculates total requisition amount
- Verify all calculations are correct

#### 5. Attach Documents (Optional):
- Click "Choose File" under document attachment
- Supported formats: PDF, DOC, DOCX, JPG, JPEG, PNG
- Maximum file size: 5MB
- Add meaningful filenames for easy identification

#### 6. Submit Requisition:
- Review all information carefully
- Click "Submit Requisition"
- Confirmation message will appear
- Requisition moves to "Pending" status

### After Submission:
- Monitor requisition status on your dashboard
- You'll receive notifications for status changes
- Requisition cannot be edited once submitted

### Editing Existing Requisitions:
- Only possible for "Pending" status requisitions
- Click the edit icon on requisition card
- Make necessary changes
- Resubmit for authorization

### Important Notes:
- **Liquidation Blocking**: If you have unliquidated approved requisitions, you cannot create new ones
- **Accuracy**: Ensure all information is accurate before submission
- **Documentation**: Attach supporting documents when required

---

## Authorizing Requisitions (Authoriser)

### Your Role:
As an Authoriser, you're the first approval level in the requisition workflow. Your job is to verify that requisitions are legitimate, properly documented, and align with organizational policies.

### Dashboard Overview:
- **Pending Requisitions**: Require your authorization
- **Statistics**: See counts of different requisition statuses
- **Action Buttons**: Download reports and manage archived items

### Authorization Process:

#### 1. Review Pending Requisitions:
- Pending requisitions appear automatically on your dashboard
- Click on any requisition card to expand details
- Review all information thoroughly

#### 2. Examine Requisition Details:
- **Staff Information**: Verify requestor identity
- **Activity Description**: Ensure purpose is clear and valid
- **Item List**: Check descriptions, quantities, and prices
- **Total Amount**: Verify calculations
- **Attached Documents**: Review supporting documentation

#### 3. Make Authorization Decision:

**To Authorize**:
1. Click "Take Action" button
2. Add authorization notes (optional but recommended)
3. Click "Authorize"
4. Requisition moves to "Authorized" status
5. Automatically forwarded to Approver

**To Reject**:
1. Click "Take Action" button
2. Add rejection notes (required)
3. Explain reason for rejection clearly
4. Click "Reject"
5. Requisition returns to staff with notes

#### 4. Add Meaningful Notes:
- **Authorization Notes**: Explain approval reasoning, any conditions, or observations
- **Rejection Notes**: Clear explanation of why requisition was rejected
- **Recommendations**: Suggest improvements if applicable

### Best Practices for Authorisers:
- **Timely Review**: Process requisitions promptly
- **Thorough Verification**: Check all details carefully
- **Clear Communication**: Provide detailed notes
- **Policy Compliance**: Ensure requests meet organizational guidelines
- **Budget Awareness**: Consider budget implications

### Download and Reporting:
- Download pending requisitions for offline review
- Generate reports for authorized/rejected items
- Export data for budget analysis

---

## Approving Requisitions (Approver)

### Your Role:
As an Approver, you provide the final approval for authorized requisitions. You have budget authority and make final spending decisions.

### Dashboard Features:
- **Authorized Requisitions**: Waiting for your approval
- **Approved/Rejected History**: Track your decisions
- **Statistics**: Monitor approval patterns

### Approval Process:

#### 1. Review Authorized Requisitions:
- Only authorized requisitions appear in your queue
- These have already passed first-level authorization
- Review authorizer notes and recommendations

#### 2. Final Verification:
- **Budget Impact**: Ensure funds are available
- **Priority Assessment**: Consider urgency and importance
- **Policy Compliance**: Final policy check
- **Cost Effectiveness**: Evaluate value for money

#### 3. Make Final Decision:

**To Approve**:
1. Click "Take Action" button
2. Add approval notes
3. Click "Approve"
4. Requisition becomes "Approved"
5. Available for liquidation processing

**To Reject**:
1. Click "Take Action" button
2. Add detailed rejection notes
3. Click "Reject"
4. Requisition marked as "Rejected"

### Post-Approval Management:
- **Liquidation Tracking**: Monitor when approved items are liquidated
- **Status Updates**: Track completion of approved requisitions
- **Budget Monitoring**: Keep track of approved spending

### Reporting Capabilities:
- Download approved requisitions
- Export rejection reports
- Generate budget impact reports

---

## Administrative Functions (Admin)

### Administrator Dashboard:
The Admin dashboard provides comprehensive system oversight and management capabilities.

### Statistics Overview:
- **Total Requisitions**: System-wide count
- **Status Breakdown**: Pending, authorized, approved, rejected
- **User Activity**: Track system usage
- **Database Statistics**: Monitor system health

### Key Administrative Functions:

#### 1. User Management:
- View all user profiles
- Manage user roles and permissions
- Reset user passwords
- Activate/deactivate accounts

#### 2. Requisition Management:
- **View All**: Access every requisition in the system
- **Status Override**: Change requisition status if needed
- **Bulk Operations**: Process multiple requisitions
- **Archive Management**: Handle archived items

#### 3. Liquidation Management:
- **Update Status**: Mark requisitions as liquidated
- **Bulk Updates**: Process multiple liquidations
- **Tracking**: Monitor liquidation progress
- **Reporting**: Generate liquidation reports

#### 4. System Maintenance:
- **Data Backup**: Export system data to Google Drive
- **Audit Logs**: Review all system activities
- **Performance Monitoring**: Track system usage
- **Data Cleanup**: Remove old archived data

#### 5. Reporting and Analytics:
- **Comprehensive Reports**: All requisitions with filters
- **Status Reports**: By requisition status
- **User Reports**: Activity by user
- **Budget Reports**: Spending analysis

### Data Management:

#### Backup Operations:
1. Click "Backup to Google Drive"
2. System creates comprehensive backup
3. Includes all requisitions and audit logs
4. Stores in secure cloud location

#### Permanent Deletion:
- **Individual Items**: Permanently delete specific archived requisitions
- **Bulk Deletion**: Remove all archived items
- **Audit Trail**: Actions are logged
- **Confirmation Required**: Multiple confirmations prevent accidents

#### Archive Management:
- **View Archived**: Access archived requisitions
- **Restore Items**: Bring archived items back if needed
- **Bulk Operations**: Manage multiple archived items

### Security Functions:
- **Audit Logs**: Review all user actions
- **Access Monitoring**: Track login activity
- **Permission Verification**: Ensure proper access controls
- **Data Integrity**: Verify system data consistency

---

## Profile Management

### Accessing Your Profile:
1. Click the "Profile" button in the header
2. Profile page opens with your information
3. Edit fields as needed
4. Save changes

### Profile Information:
- **Name**: Your full name as it appears in the system
- **Email**: Your login email address
- **Roles**: Display only (managed by administrator)
- **Digital Signature**: Upload/manage your signature

### Updating Profile:
1. **Edit Name**: Click in name field and modify
2. **Update Email**: Change email address if needed
3. **Save Changes**: Click "Save Changes" button
4. **Confirmation**: Success message appears

### Important Notes:
- **Role Changes**: Only administrators can modify user roles
- **Email Changes**: May affect login credentials
- **Profile Updates**: Reflect immediately in system

---

## Digital Signatures

### Purpose:
Digital signatures are automatically included in PDF requisitions for official documentation and approval verification.

### Setting Up Your Signature:

#### First Time Setup:
1. Navigate to your Profile page
2. Scroll to "Digital Signature" section
3. Click the upload area or "Click to upload signature image"
4. Select your signature image file

#### File Requirements:
- **Format**: PNG, JPG, JPEG
- **Size**: Maximum 2MB
- **Quality**: Clear, high-contrast image
- **Background**: Transparent or white preferred

#### Managing Your Signature:

**Uploading New Signature**:
1. Click upload area
2. Select image file
3. System validates and uploads
4. Preview appears immediately

**Replacing Existing Signature**:
1. Click "Replace Signature"
2. Select new image file
3. Old signature is automatically deleted
4. New signature becomes active

**Removing Signature**:
1. Click "Remove" button
2. Confirm deletion
3. Signature removed from system

### Best Practices:
- **Scan Quality**: Use high-resolution scans
- **Contrast**: Ensure signature is clearly visible
- **Size**: Keep file size reasonable while maintaining quality
- **Format**: PNG files often work best for signatures

### Usage in System:
- Automatically included in generated PDFs
- Shows on requisition documents
- Provides authentication for approvals
- Maintains audit trail integrity

---

## Liquidation Process

### What is Liquidation?
Liquidation is the process of confirming that approved requisition funds have been properly spent and accounted for. It's the final step in the requisition lifecycle.

### Liquidation Workflow:

#### 1. Approved Requisitions:
- Requisitions become eligible for liquidation after approval
- Status initially shows as "Not Liquidated"
- Staff cannot create new requisitions until liquidation is complete

#### 2. Liquidation Requirements:
- **Documentation**: Proof of purchase (receipts, invoices)
- **Verification**: Confirmation items were received
- **Accounting**: Proper expense recording
- **Approval**: Administrative sign-off

#### 3. Marking as Liquidated:
**For Staff**:
- Cannot self-liquidate
- Must request liquidation from administrator
- Provide all required documentation

**For Administrators**:
1. Review liquidation documentation
2. Verify proper spending
3. Update liquidation status in system
4. Add liquidation notes if needed

### Liquidation Statuses:
- **Not Applicable**: Requisition doesn't require liquidation
- **Not Liquidated**: Awaiting liquidation processing
- **Liquidated**: Process complete and verified

### Impact on Users:
- **Staff**: Cannot create new requisitions while having unliquidated approved items
- **System**: Maintains spending accountability
- **Reporting**: Tracks completion of expenditures

### Best Practices:
- **Prompt Processing**: Handle liquidation quickly
- **Complete Documentation**: Maintain proper records
- **Regular Review**: Monitor liquidation status
- **Clear Communication**: Keep staff informed of requirements

---

## Document Management

### Supported File Types:
- **PDF**: Preferred for official documents
- **Word Documents**: DOC, DOCX
- **Images**: JPG, JPEG, PNG
- **Maximum Size**: 5MB per file

### Uploading Documents:

#### During Requisition Creation:
1. Complete requisition form
2. Scroll to "Attach Document" section
3. Click "Choose File"
4. Select document from your computer
5. File name appears when selected
6. Submit requisition with attached document

#### Document Validation:
- System checks file type and size
- Error messages appear for invalid files
- Only approved formats are accepted

### Document Storage:
- **Secure Storage**: Files stored in encrypted cloud storage
- **Access Control**: Only authorized users can view documents
- **Backup**: Documents included in system backups
- **Retention**: Documents preserved with requisition records

### Viewing Documents:
- **Download Link**: Available on requisition details
- **File Name**: Original filename preserved
- **Security**: Direct links require authentication

### Best Practices:
- **Meaningful Names**: Use descriptive filenames
- **Quality**: Ensure documents are clear and readable
- **Completeness**: Include all relevant supporting documentation
- **Security**: Don't include sensitive personal information unless necessary

---

## Reports and Downloads

### Available Reports:
The system provides comprehensive reporting capabilities for different user roles.

### Staff Reports:
- **My Requisitions**: All your requisitions with status
- **Download Format**: Individual PDFs in ZIP file
- **Content**: Complete requisition details with signatures

### Authoriser Reports:
- **Pending Requisitions**: Items awaiting authorization
- **Authorized Items**: Requisitions you've authorized
- **Rejected Items**: Requisitions you've rejected
- **Complete History**: All items you've processed

### Approver Reports:
- **Authorized Queue**: Items waiting for approval
- **Approved Items**: Requisitions you've approved
- **Rejected Items**: Final rejections
- **Status Summary**: Overview of approval activity

### Administrator Reports:
- **System-wide Reports**: All requisitions by status
- **User Activity**: Reports by staff member
- **Budget Analysis**: Spending summaries
- **Audit Reports**: Complete system activity

### Download Process:
1. **Select Report Type**: Choose appropriate report
2. **Apply Filters**: Select date range or status if available
3. **Click Download**: System generates report
4. **File Processing**: ZIP file created with individual PDFs
5. **Download Complete**: Save file to your computer

### Report Contents:
Each PDF includes:
- **Requisition Details**: Complete item information
- **User Information**: Staff details and signatures
- **Approval Trail**: Authorization and approval notes
- **Status History**: Complete workflow tracking
- **Timestamps**: All action dates and times

### Best Practices:
- **Regular Downloads**: Keep local copies for records
- **Organized Storage**: Create folder structure for downloaded reports
- **Backup**: Maintain backup copies of important reports
- **Review**: Check reports for accuracy

---

## Troubleshooting

### Common Issues and Solutions:

#### Login Problems:
**Issue**: Cannot log in
**Solutions**:
- Verify email address is correct
- Check password (case-sensitive)
- Ensure account is activated
- Contact administrator for password reset

**Issue**: Account locked
**Solutions**:
- Wait 15 minutes and try again
- Contact administrator for assistance
- Verify you're using correct credentials

#### Requisition Issues:
**Issue**: Cannot create new requisition
**Solutions**:
- Check for unliquidated approved requisitions
- Contact admin to mark existing requisitions as liquidated
- Ensure you have proper staff permissions

**Issue**: Upload fails
**Solutions**:
- Check file size (maximum 5MB)
- Verify file type is supported
- Try different file format
- Check internet connection

#### Display Problems:
**Issue**: Dashboard not loading properly
**Solutions**:
- Refresh browser page
- Clear browser cache
- Try different browser
- Check internet connection

**Issue**: Role switcher not appearing
**Solutions**:
- Verify you have multiple roles
- Contact administrator to check role assignments
- Log out and log back in

#### Performance Issues:
**Issue**: System running slowly
**Solutions**:
- Check internet connection speed
- Close unnecessary browser tabs
- Clear browser cache
- Try using different browser

### Getting Help:
1. **First**: Try troubleshooting steps above
2. **Documentation**: Review relevant sections of this manual
3. **Administrator**: Contact your system administrator
4. **Email Support**: Use official support channels

### Error Messages:
- **Read Carefully**: Error messages provide specific guidance
- **Take Screenshots**: Helpful for support requests
- **Note Timing**: When did the error occur?
- **Record Actions**: What were you trying to do?

---

## Best Practices

### For All Users:

#### Security:
- **Strong Passwords**: Use complex, unique passwords
- **Secure Logout**: Always log out when finished
- **Screen Privacy**: Don't leave system open unattended
- **Information Security**: Protect sensitive requisition data

#### Data Quality:
- **Accurate Information**: Double-check all entries
- **Complete Documentation**: Provide all required details
- **Meaningful Descriptions**: Use clear, descriptive language
- **Regular Updates**: Keep profile information current

#### Communication:
- **Clear Notes**: Write detailed notes for approvals/rejections
- **Professional Language**: Maintain business communication standards
- **Timely Responses**: Process items promptly
- **Follow-up**: Monitor status of your actions

### For Staff:

#### Requisition Creation:
- **Plan Ahead**: Prepare requisitions in advance
- **Accurate Pricing**: Research current prices
- **Complete Items**: Include all necessary items in one requisition
- **Supporting Documents**: Attach relevant documentation

#### Follow-up:
- **Monitor Status**: Check requisition progress regularly
- **Respond Quickly**: Address any questions or rejection notes
- **Liquidation Tracking**: Complete liquidation process promptly

### For Authorisers:

#### Review Process:
- **Thorough Examination**: Review all requisition details
- **Policy Compliance**: Ensure alignment with organizational policies
- **Budget Awareness**: Consider budget implications
- **Timely Processing**: Don't let requisitions sit idle

#### Communication:
- **Constructive Feedback**: Provide helpful rejection notes
- **Clear Expectations**: Communicate requirements clearly
- **Documentation**: Maintain good records of decisions

### For Approvers:

#### Final Review:
- **Budget Authority**: Ensure spending is within authorized limits
- **Strategic Alignment**: Verify requisitions support organizational goals
- **Risk Assessment**: Consider financial and operational risks
- **Final Verification**: Last chance to catch any issues

### For Administrators:

#### System Management:
- **Regular Backups**: Maintain current system backups
- **User Management**: Keep user roles and permissions updated
- **Performance Monitoring**: Watch system performance metrics
- **Security Oversight**: Monitor for unusual activity

#### Data Integrity:
- **Regular Audits**: Review system data periodically
- **Cleanup Activities**: Remove unnecessary archived data
- **Report Generation**: Provide regular status reports
- **Documentation**: Maintain system documentation

### General Efficiency Tips:

#### Browser Optimization:
- **Use Latest Version**: Keep browser updated
- **Clear Cache**: Regularly clear browser cache
- **Stable Connection**: Ensure reliable internet connection
- **Multiple Tabs**: Avoid having too many tabs open

#### Workflow Optimization:
- **Batch Processing**: Handle similar items together
- **Regular Schedules**: Set consistent times for system tasks
- **Preparation**: Gather information before starting
- **Templates**: Use consistent formats for notes and descriptions

---

## System Training Checklist

### For New Users:
- [ ] Account setup and first login
- [ ] Profile completion with digital signature
- [ ] Dashboard orientation and navigation
- [ ] Role-specific functionality training
- [ ] Practice requisition creation (for staff)
- [ ] Review approval process (for authorizers/approvers)
- [ ] Document upload and management
- [ ] Report generation and download
- [ ] Password security and best practices

### For Trainers:
- [ ] Prepare demo requisitions
- [ ] Set up test accounts with different roles
- [ ] Demonstrate complete workflow
- [ ] Practice common scenarios
- [ ] Review error handling
- [ ] Explain escalation procedures
- [ ] Provide contact information for support
- [ ] Schedule follow-up training if needed

---

## Conclusion

The Digital Requisition System is designed to streamline and improve the requisition process for Elimu Canada. By following this manual and the best practices outlined, users can efficiently navigate the system and contribute to improved organizational processes.

Remember:
- **Security First**: Always protect system access and data
- **Accuracy Matters**: Careful data entry prevents problems
- **Communication**: Clear notes and timely responses help everyone
- **Continuous Learning**: The system may evolve - stay informed of updates

For additional support or questions not covered in this manual, contact your system administrator.

---

**Document Information:**
- **Version**: 1.0
- **Last Updated**: [Current Date]
- **Prepared By**: System Administrator
- **For**: Elimu Canada Staff Training

**Training Schedule:**
- **Date**: [To be scheduled]
- **Duration**: Approximately 2-3 hours
- **Format**: Hands-on training with live system
- **Prerequisites**: Basic computer literacy, email access

---

*This manual covers all aspects of the Digital Requisition System as of the current version. Please refer to your administrator for any updates or changes to functionality.*