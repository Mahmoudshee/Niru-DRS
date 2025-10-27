import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { Requisition } from '@/types/requisition';
import { supabase } from '@/integrations/supabase/client';

// IMPORTANT: We now ONLY use the profiles table for signature URLs
// This ensures signatures are fetched from the signature_url field in profiles table
// and NO automatic deletion or sync happens - users must manually manage their signatures
// The signature_url field in profiles table is the single source of truth for signatures

// Helper function to get user signature from profiles table by name
const getUserSignatureFromProfilesByName = async (userName: string): Promise<string | null> => {
  try {
    console.log('🔍 Looking for signature in profiles table for user:', userName);
    
    // Get user profile with signature_url from profiles table
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, signature_url')
      .ilike('name', userName)
      .maybeSingle();

    if (profileError || !userProfile) {
      console.log('❌ No user profile found for:', userName, profileError?.message);
      return null;
    }

    console.log('✅ Found user profile:', { id: userProfile.id, name: userProfile.name });

    // Use the signature_url directly from the profiles table
    const signatureUrl = userProfile.signature_url;
    
    if (!signatureUrl) {
      console.log('⚠️ No signature URL found in profile for:', userName);
      return null;
    }

    console.log('📋 Found signature URL from profiles table:', signatureUrl);

    // Convert URL to base64 for PDF embedding
    const response = await fetch(signatureUrl);
    if (!response.ok) {
      console.error('❌ Failed to fetch signature image from URL:', response.status, response.statusText);
      return null;
    }
    
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('✅ Successfully converted signature to base64 for:', userName);
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        console.error('❌ Error converting signature to base64 for:', userName);
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('❌ Error getting signature from profiles table:', error);
    return null;
  }
};

// Helper function to get user signature from profiles table by user ID
const getUserSignatureFromProfilesById = async (userId: string): Promise<string | null> => {
  try {
    if (!userId || !isValidUUID(userId)) {
      return null;
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, signature_url')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !userProfile || !userProfile.signature_url) {
      return null;
    }

    const response = await fetch(userProfile.signature_url);
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('❌ Error getting signature from profiles by id:', error);
    return null;
  }
};

// Helper function to get user signature by name (from profiles table only)
const getUserSignatureByName = async (userName: string): Promise<string | null> => {
  // Skip if it's just "Authorized" or "Approved" placeholder
  if (userName === 'Authorized' || userName === 'Approved' || userName === 'In Progress' || userName === 'N/A') return null;
  
  // Skip if username is empty or whitespace only
  if (!userName || userName.trim() === '') {
    console.log('⚠️ Skipping signature lookup for empty username');
    return null;
  }

  console.log('🔍 Getting signature for user:', userName);
  
  // Get signature from profiles table by name
  const signature = await getUserSignatureFromProfilesByName(userName);
  
  if (signature) {
    console.log('✅ Successfully retrieved signature from profiles table for:', userName);
  } else {
    console.log('❌ No signature found in profiles table for:', userName);
  }

  return signature;
};

// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Helper function to get user name from audit logs
const getUserNameFromAuditLogs = async (requisitionId: string, action: 'authorized' | 'approved'): Promise<string> => {
  try {
    // Get audit log for the specific action
    const { data: auditLog, error } = await supabase
      .from('audit_logs')
      .select('performedBy')
      .eq('requisitionId', requisitionId)
      .eq('action', action)
      .maybeSingle();
    
    if (error) {
      // Handle permission errors gracefully (non-admins can't access audit logs)
      if (error.code === 'PGRST301' || error.message?.includes('row-level security')) {
        return action === 'authorized' ? 'Authorized' : 'Approved';
      }
      console.error(`Error fetching ${action} audit log:`, error);
      return action === 'authorized' ? 'Authorized' : 'Approved';
    }
    
    if (!auditLog) {
      return action === 'authorized' ? 'Authorized' : 'Approved';
    }
    
    // Get user name from the performedBy ID from profiles table
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', auditLog.performedBy)
      .single();
    
    if (userError || !userData) {
      // If not found in profiles table, return the performedBy value itself
      return auditLog.performedBy;
    }
    
    return userData.name;
  } catch (error) {
    console.error('Error fetching user name from audit logs:', error);
    return action === 'authorized' ? 'Authorized' : 'Approved';
  }
};

// Helper to get the userId from audit logs for an action
const getUserIdFromAuditLogs = async (requisitionId: string, action: 'authorized' | 'approved'): Promise<string | null> => {
  try {
    const { data: auditLog, error } = await supabase
      .from('audit_logs')
      .select('performedBy')
      .eq('requisitionId', requisitionId)
      .eq('action', action)
      .maybeSingle();

    if (error) {
      // Respect RLS: return null so caller can decide visibility
      return null;
    }

    return auditLog?.performedBy ?? null;
  } catch (error) {
    return null;
  }
};

export const generateRequisitionPDF = async (requisition: Requisition, authoriserName?: string, approverName?: string, currentUserRole?: string, currentUserId?: string) => {
  const pdf = new jsPDF();
  
  // Add NiRu logo centered at the top
  try {
    const logoResponse = await fetch('/Futuristic NIRU_DRS Logo Design.png');
    if (!logoResponse.ok) {
      throw new Error(`Logo not found`);
    }
    
    const logoBlob = await logoResponse.blob();
    const logoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(logoBlob);
    });
    
    // Add logo centered above the header
    const pageWidth = pdf.internal.pageSize.getWidth();
    pdf.addImage(logoDataUrl, 'PNG', pageWidth / 2 - 20, 10, 40, 20);
  } catch (error) {
    console.warn('Could not load logo:', error);
    // Continue without logo instead of failing
  }
  
  // Get page dimensions
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const bottomMargin = 20;
  
  // Set theme colors (subtle)
  const primaryColor = [41, 128, 185]; // Professional blue
  const accentColor = [52, 73, 94]; // Dark gray
  
  // Helper function to check if we need a new page
  const checkPageSpace = (neededSpace: number, currentY: number) => {
    if (currentY + neededSpace > pageHeight - bottomMargin) {
      pdf.addPage();
      return 30; // Return new Y position after header space
    }
    return currentY;
  };
  
  // Determine names based on status - fetch from audit logs
  let displayAuthoriserName = '';
  let displayApproverName = '';
  
  if (requisition.status === 'rejected') {
    displayAuthoriserName = 'Rejected';
    displayApproverName = 'Rejected';
  } else if (requisition.status === 'pending') {
    displayAuthoriserName = 'In Progress';
    displayApproverName = 'In Progress';
  } else if (requisition.status === 'authorized') {
    // Get actual authorizer name from audit logs
    displayAuthoriserName = await getUserNameFromAuditLogs(requisition.id, 'authorized');
    displayApproverName = 'In Progress';
  } else if (requisition.status === 'approved') {
    // Get actual names from audit logs
    displayAuthoriserName = await getUserNameFromAuditLogs(requisition.id, 'authorized');
    displayApproverName = await getUserNameFromAuditLogs(requisition.id, 'approved');
  }
  
  // Company Header with subtle color - positioned below logo
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  const headerText = 'NIRU DEVELOPMENT PROJECTS';
  const headerWidth = pdf.getTextWidth(headerText);
  pdf.text(headerText, (pageWidth - headerWidth) / 2, 38);
  
  // Address and contact info - compact
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  const addressText = 'P.O.BOX 1447 - 80200, Malindi, Kenya | Tel: 0700875540';
  const addressWidth = pdf.getTextWidth(addressText);
  pdf.text(addressText, (pageWidth - addressWidth) / 2, 46);
  
  // Form title - compact
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  const formTitle = 'REQUISITION FORM';
  const titleWidth = pdf.getTextWidth(formTitle);
  pdf.text(formTitle, (pageWidth - titleWidth) / 2, 56);
  
  // Reset to black for content
  pdf.setTextColor(0, 0, 0);
  
  let yPosition = 68;
  
  // Helper function to convert number to words (simplified for KES)
  const convertToWords = (amount: number): string => {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const thousands = ['', 'thousand', 'million', 'billion'];

  const shillings = Math.floor(amount);
  const cents = Math.round((amount - shillings) * 100);

  const convertHundreds = (num: number): string => {
    let result = '';
    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + ' hundred ';
      num %= 100;
    }
    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    } else if (num >= 10) {
      result += teens[num - 10] + ' ';
      return result;
    }
    if (num > 0) {
      result += ones[num] + ' ';
    }
    return result.trim() + ' ';
  };

  let result = '';
  let thousandIndex = 0;
  let remaining = shillings;

  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk !== 0) {
      result = convertHundreds(chunk) + thousands[thousandIndex] + ' ' + result;
    }
    remaining = Math.floor(remaining / 1000);
    thousandIndex++;
  }

  const shillingWords = result.trim() + ' shillings';
  const centWords = cents > 0 ? ` and ${convertHundreds(cents).trim()} cents` : '';

  return (shillingWords + centWords + ' only').toUpperCase();
};

  
  // Staff Name - compact
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('STAFF NAME:', 20, yPosition);
  pdf.text(requisition.staffName, 80, yPosition);
  yPosition += 12;
  
  // Amount in Words - compact
  pdf.text('AMOUNT IN WORDS:', 20, yPosition);
  const amountInWords = convertToWords(requisition.totalAmount);
  const wordsLines = pdf.splitTextToSize(amountInWords.toUpperCase(), 120);
  pdf.text(wordsLines, 80, yPosition);
  yPosition += wordsLines.length * 6 + 8;
  
  // Type of Activity - compact
  pdf.text('TYPE OF ACTIVITY:', 20, yPosition);
  const activityLines = pdf.splitTextToSize(requisition.activity, 120);
  pdf.text(activityLines, 80, yPosition);
  yPosition += activityLines.length * 6 + 10;
  
  // Details table - clean simple table without colors/shading with quantity column
  const tableStartY = yPosition;
  const tableWidth = 170;
  const col1Width = 18; // A/C CODE (item number) - slightly wider for better fit
  const col2Width = 72; // DETAILS - adjusted
  const col3Width = 30; // QTY @ PRICE - new column
  const col4Width = 50; // AMOUNT - kept same
  
  // Table headers - simple black borders only
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  
  // Draw main header row as one continuous rectangle
  pdf.rect(20, tableStartY, tableWidth, 15);
  
  // Draw vertical lines to separate columns in header
  pdf.line(20 + col1Width, tableStartY, 20 + col1Width, tableStartY + 15);
  pdf.line(20 + col1Width + col2Width, tableStartY, 20 + col1Width + col2Width, tableStartY + 15);
  pdf.line(20 + col1Width + col2Width + col3Width, tableStartY, 20 + col1Width + col2Width + col3Width, tableStartY + 15);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  
  // Center align headers
  const acCodeText = 'A/C CODE';
  const detailsText = 'DETAILS';
  const qtyText = 'QTY @ PRICE';
  const amountText = 'AMOUNT';
  
  pdf.text(acCodeText, 20 + (col1Width - pdf.getTextWidth(acCodeText)) / 2, tableStartY + 10);
  pdf.text(detailsText, 20 + col1Width + (col2Width - pdf.getTextWidth(detailsText)) / 2, tableStartY + 10);
  pdf.text(qtyText, 20 + col1Width + col2Width + (col3Width - pdf.getTextWidth(qtyText)) / 2, tableStartY + 10);
  pdf.text(amountText, 20 + col1Width + col2Width + col3Width + (col4Width - pdf.getTextWidth(amountText)) / 2, tableStartY + 10);
  
  // Sub-headers for amount - draw as continuous row
  const subHeaderY = tableStartY + 15;
  pdf.rect(20 + col1Width + col2Width + col3Width, subHeaderY, col4Width, 10);
  pdf.line(20 + col1Width + col2Width + col3Width + col4Width / 2, subHeaderY, 20 + col1Width + col2Width + col3Width + col4Width / 2, subHeaderY + 10);
  
  pdf.setFontSize(9);
  const kshsText = 'KSHS';
  const ctsText = 'CTS';
  pdf.text(kshsText, 20 + col1Width + col2Width + col3Width + (col4Width / 2 - pdf.getTextWidth(kshsText)) / 2, subHeaderY + 7);
  pdf.text(ctsText, 20 + col1Width + col2Width + col3Width + col4Width / 2 + (col4Width / 2 - pdf.getTextWidth(ctsText)) / 2, subHeaderY + 7);
  
  // Table rows for items - draw as continuous rows with intelligent page break handling
  let currentY = tableStartY + 25;
  
  requisition.items.forEach((item, index) => {
    const rowHeight = 12;
    
    // Only add a new page if the current row would exceed the page height
    // Leave room for the row itself (no forced space for total/signatures)
    if (currentY + rowHeight > pageHeight - bottomMargin) {
      // Add a new page and continue the table (no header repetition)
      pdf.addPage();
      currentY = 30;
    }
    
    // Draw row as one continuous rectangle
    pdf.rect(20, currentY, tableWidth, rowHeight);
    
    // Draw vertical lines to separate columns
    pdf.line(20 + col1Width, currentY, 20 + col1Width, currentY + rowHeight);
    pdf.line(20 + col1Width + col2Width, currentY, 20 + col1Width + col2Width, currentY + rowHeight);
    pdf.line(20 + col1Width + col2Width + col3Width, currentY, 20 + col1Width + col2Width + col3Width, currentY + rowHeight);
    pdf.line(20 + col1Width + col2Width + col3Width + col4Width / 2, currentY, 20 + col1Width + col2Width + col3Width + col4Width / 2, currentY + rowHeight);
    
    // Add content with proper alignment
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    
    // Center align item number
    const itemNum = (index + 1).toString();
    pdf.text(itemNum, 20 + (col1Width - pdf.getTextWidth(itemNum)) / 2, currentY + 8);
    
    // Left align description with small margin - truncate for narrower column
    const truncatedDesc = item.description.length > 35 ? 
      item.description.substring(0, 32) + '...' : item.description;
    pdf.text(truncatedDesc, 22 + col1Width, currentY + 8);
    
    // Center align quantity @ price
    const qtyPriceText = `${item.quantity} @ ${item.unitPrice.toFixed(2)}`;
    const qtyPriceWidth = pdf.getTextWidth(qtyPriceText);
    pdf.text(qtyPriceText, 20 + col1Width + col2Width + (col3Width - qtyPriceWidth) / 2, currentY + 8);
    
    // Right align amounts
    const shillings = Math.floor(item.totalPrice).toString();
    const cents = ((item.totalPrice % 1) * 100).toFixed(0).padStart(2, '0');
    
    pdf.text(shillings, 20 + col1Width + col2Width + col3Width + col4Width / 2 - 2 - pdf.getTextWidth(shillings), currentY + 8);
    pdf.text(cents, 20 + col1Width + col2Width + col3Width + col4Width - 2 - pdf.getTextWidth(cents), currentY + 8);
    
    currentY += rowHeight;
  });
  
  // Total row - draw as continuous row
  const totalRowHeight = 15;
  
  // Only add new page if total row itself won't fit
  if (currentY + totalRowHeight > pageHeight - bottomMargin) {
    pdf.addPage();
    currentY = 30;
  }
  
  pdf.rect(20, currentY, tableWidth, totalRowHeight);
  
  // Draw vertical lines (adjusted for new columns)
  pdf.line(20 + col1Width + col2Width + col3Width, currentY, 20 + col1Width + col2Width + col3Width, currentY + totalRowHeight);
  pdf.line(20 + col1Width + col2Width + col3Width + col4Width / 2, currentY, 20 + col1Width + col2Width + col3Width + col4Width / 2, currentY + totalRowHeight);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  
  // Center align TOTAL text in the combined first three columns
  const totalText = 'TOTAL';
  pdf.text(totalText, 20 + (col1Width + col2Width + col3Width - pdf.getTextWidth(totalText)) / 2, currentY + 10);
  
  // Right align total amounts
  const totalShillings = Math.floor(requisition.totalAmount).toString();
  const totalCents = ((requisition.totalAmount % 1) * 100).toFixed(0).padStart(2, '0');
  
  pdf.text(totalShillings, 20 + col1Width + col2Width + col3Width + col4Width / 2 - 2 - pdf.getTextWidth(totalShillings), currentY + 10);
  pdf.text(totalCents, 20 + col1Width + col2Width + col3Width + col4Width - 2 - pdf.getTextWidth(totalCents), currentY + 10);
  
  yPosition = currentY + totalRowHeight + 15; // Add space after table
  
  // Only add new page for signatures if they won't fit on current page
  const signaturesHeight = 70; // Total height needed for all signature sections
  if (yPosition + signaturesHeight > pageHeight - bottomMargin) {
    pdf.addPage();
    yPosition = 30;
  }

  // Signature sections - compact
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  // Prepared by section
  pdf.text('PREPARED BY:', 20, yPosition);
  pdf.setFont('helvetica', 'bold');
  pdf.text(requisition.staffName, 80, yPosition);
  // Underline the name
  const nameWidth = pdf.getTextWidth(requisition.staffName);
  pdf.line(80, yPosition + 2, 80 + nameWidth, yPosition + 2);
  pdf.setFont('helvetica', 'normal');
  yPosition += 12;
  
  pdf.text('SIGNATURE:', 20, yPosition);
  pdf.text('DATE:', 120, yPosition);
  pdf.text(new Date(requisition.date).toLocaleDateString(), 140, yPosition);
  
  // Try to add staff signature image, centered under the name
  const staffNameX = 80;
  const staffNameCenterX = staffNameX + (nameWidth / 2);
  const signatureWidth = 40;
  const signatureX = staffNameCenterX - (signatureWidth / 2);
  
  try {
    // Transparency: always show staff signature if available
    const shouldShowStaffSignature = true;

    if (shouldShowStaffSignature) {
      console.log('Trying to add staff signature for:', requisition.staffName);
      // Prefer fetching by user ID for reliability
      let staffSignature: string | null = null;
      if (requisition.staffId && isValidUUID(requisition.staffId)) {
        staffSignature = await getUserSignatureFromProfilesById(requisition.staffId);
      }
      // Fallback to name-based lookup if ID-based fails
      if (!staffSignature) {
        staffSignature = await getUserSignatureByName(requisition.staffName);
      }
      if (staffSignature) {
        console.log('Adding staff signature for:', requisition.staffName);
        pdf.addImage(staffSignature, 'PNG', signatureX, yPosition - 6, signatureWidth, 10);
      } else {
        console.log('No staff signature found for:', requisition.staffName);
      }
    } else {
      console.log('Staff signature not visible to current user role:', currentUserRole);
    }
  } catch (error) {
    console.error('Error adding staff signature:', error);
  }
  // Always add clean underline for signature area
  pdf.line(signatureX, yPosition + 2, signatureX + signatureWidth, yPosition + 2);
  yPosition += 18;
  
  // Authorised by section
  pdf.text('AUTHORISED BY:', 20, yPosition);
  pdf.setFont('helvetica', 'bold');
  pdf.text(displayAuthoriserName, 80, yPosition);
  // Underline the authoriser name
  const authNameWidth = pdf.getTextWidth(displayAuthoriserName);
  pdf.line(80, yPosition + 2, 80 + authNameWidth, yPosition + 2);
  pdf.setFont('helvetica', 'normal');
  yPosition += 12;
  
  pdf.text('SIGNATURE:', 20, yPosition);
  pdf.text('DATE:', 120, yPosition);
  if (requisition.authorizedAt) {
    pdf.text(new Date(requisition.authorizedAt).toLocaleDateString(), 140, yPosition);
  }
  
  // Try to add authoriser signature image, centered under the name
  const authNameX = 80;
  const authNameCenterX = authNameX + (authNameWidth / 2);
  const authSignatureWidth = 40;
  const authSignatureX = authNameCenterX - (authSignatureWidth / 2);
  
  // Transparency: show authoriser signature to everyone once authorized/approved
  const shouldShowAuthoriserSignature = ['authorized', 'approved'].includes(requisition.status);

  if (shouldShowAuthoriserSignature && ['authorized', 'approved'].includes(requisition.status) && displayAuthoriserName !== 'In Progress') {
    try {
      console.log('Trying to add authorizer signature for:', displayAuthoriserName);
      // Fetch by audit log userId primarily
      const authoriserUserId = await getUserIdFromAuditLogs(requisition.id, 'authorized');
      let authoriserSig: string | null = null;
      if (authoriserUserId) {
        authoriserSig = await getUserSignatureFromProfilesById(authoriserUserId);
      }
      if (!authoriserSig) {
        authoriserSig = await getUserSignatureByName(displayAuthoriserName);
      }
      if (authoriserSig) {
        console.log('Successfully added authorizer signature');
        pdf.addImage(authoriserSig, 'PNG', authSignatureX, yPosition - 6, authSignatureWidth, 10);
      } else {
        console.log('No authorizer signature found for:', displayAuthoriserName);
      }
    } catch (error) {
      console.error('Error adding authorizer signature:', error);
    }
    pdf.line(authSignatureX, yPosition + 2, authSignatureX + authSignatureWidth, yPosition + 2);
  } else if (requisition.status === 'rejected' && requisition.authorizedAt) {
    // Show rejection date and mark as rejected
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('REJECTED', authSignatureX, yPosition + 2);
    // Show the rejection date
    pdf.setFontSize(8);
    pdf.text(`(${new Date(requisition.authorizedAt).toLocaleDateString()})`, authSignatureX, yPosition + 8);
  } else if (displayAuthoriserName === 'In Progress') {
    // Show "In Progress" for pending authorization
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('IN PROGRESS', authSignatureX, yPosition + 2);
  } else {
    pdf.line(authSignatureX, yPosition + 2, authSignatureX + authSignatureWidth, yPosition + 2);
  }

  yPosition += 18;
  
  // Approved by section
  pdf.text('APPROVED BY:', 20, yPosition);
  pdf.setFont('helvetica', 'bold');
  pdf.text(displayApproverName, 80, yPosition);
  // Underline the approver name
  const appNameWidth = pdf.getTextWidth(displayApproverName);
  pdf.line(80, yPosition + 2, 80 + appNameWidth, yPosition + 2);
  pdf.setFont('helvetica', 'normal');
  yPosition += 12;
  
  pdf.text('SIGNATURE:', 20, yPosition);
  pdf.text('DATE:', 120, yPosition);
  if (requisition.approvedAt) {
    pdf.text(new Date(requisition.approvedAt).toLocaleDateString(), 140, yPosition);
  }
  
  // Try to add approver signature image, centered under the name
  const appNameX = 80;
  const appNameCenterX = appNameX + (appNameWidth / 2);
  const appSignatureWidth = 40;
  const appSignatureX = appNameCenterX - (appSignatureWidth / 2);
  
  // Transparency: show approver signature to everyone once approved
  const shouldShowApproverSignature = requisition.status === 'approved';

  if (shouldShowApproverSignature && requisition.status === 'approved' && displayApproverName !== 'In Progress') {
    try {
      console.log('Trying to add approver signature for:', displayApproverName);
      // Fetch by audit log userId primarily
      const approverUserId = await getUserIdFromAuditLogs(requisition.id, 'approved');
      let approverSig: string | null = null;
      if (approverUserId) {
        approverSig = await getUserSignatureFromProfilesById(approverUserId);
      }
      if (!approverSig) {
        approverSig = await getUserSignatureByName(displayApproverName);
      }
      if (approverSig) {
        console.log('Successfully added approver signature');
        pdf.addImage(approverSig, 'PNG', appSignatureX, yPosition - 6, appSignatureWidth, 10);
      } else {
        console.log('No approver signature found for:', displayApproverName);
      }
    } catch (error) {
      console.error('Error adding approver signature:', error);
    }
    pdf.line(appSignatureX, yPosition + 2, appSignatureX + appSignatureWidth, yPosition + 2);
  } else if (requisition.status === 'rejected' && requisition.approvedAt) {
    // Show rejection date and mark as rejected by approver
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('REJECTED', appSignatureX, yPosition + 2);
    // Show the rejection date
    pdf.setFontSize(8);
    pdf.text(`(${new Date(requisition.approvedAt).toLocaleDateString()})`, appSignatureX, yPosition + 8);
  } else if (displayApproverName === 'In Progress') {
    // Show "In Progress" for pending approval
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('IN PROGRESS', appSignatureX, yPosition + 2);
  } else {
    pdf.line(appSignatureX, yPosition + 2, appSignatureX + appSignatureWidth, yPosition + 2);
  }
  yPosition += 12;
  
  // Enhanced document attachment section with clickable link (if present)
  if (requisition.documentUrl && requisition.documentName) {
    yPosition = checkPageSpace(25, yPosition);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Attached Document:', 20, yPosition);
    yPosition += 8;
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(`File Name: ${requisition.documentName}`, 20, yPosition);
    yPosition += 6;
    
    // Add clickable link to the document
    pdf.setTextColor(0, 0, 255); // Blue color for link
    const linkText = 'Click here to download/view document';
    pdf.textWithLink(linkText, 20, yPosition, { url: requisition.documentUrl });
    
    // Add underline to make it look like a link
    const textWidth = pdf.getTextWidth(linkText);
    pdf.line(20, yPosition + 1, 20 + textWidth, yPosition + 1);
    
    // Reset color back to black
    pdf.setTextColor(0, 0, 0);
    yPosition += 15;
  }
  
  // Return the PDF blob instead of saving directly
  return pdf.output('blob');
};

// Function to save individual PDF
export const saveIndividualRequisitionPDF = async (requisition: Requisition, currentUserRole?: string, currentUserId?: string) => {
  // Generate the PDF content with automatic name fetching from audit logs
  const blob = await generateRequisitionPDF(requisition, undefined, undefined, currentUserRole, currentUserId);
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `requisition-${requisition.id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Function to generate multiple individual PDFs in a zip file
export const generateRequisitionsZip = async (requisitions: Requisition[], zipName: string, currentUserRole?: string, currentUserId?: string) => {
  const zip = new JSZip();
  
  for (const requisition of requisitions) {
    try {
      // Names will be fetched automatically from audit logs inside generateRequisitionPDF
      const pdfBlob = await generateRequisitionPDF(requisition, undefined, undefined, currentUserRole, currentUserId);
      
      // Add to zip with unique filename
      zip.file(`requisition-${requisition.id}-${requisition.staffName.replace(/\s+/g, '_')}.pdf`, pdfBlob);
    } catch (error) {
      console.error(`Failed to generate PDF for requisition ${requisition.id}:`, error);
    }
  }
  
  // Generate and download the zip file
  try {
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${zipName}-${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to generate zip file:', error);
  }
};

export const generateRequisitionsSummaryPDF = async (requisitions: Requisition[], title: string) => {
  const pdf = new jsPDF();
  
  // Add header
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('NiRu DRS - Requisitions Summary', 20, 20);
  
  pdf.setFontSize(12);
  pdf.text(title, 20, 35);
  pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 45);
  
  let yPosition = 65;
  
  requisitions.forEach((req, index) => {
    if (yPosition > 240) { // Leave more space for document links
      pdf.addPage();
      yPosition = 20;
    }
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${index + 1}. ${req.id}`, 20, yPosition);
    yPosition += 7;
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Staff: ${req.staffName} | Date: ${new Date(req.date).toLocaleDateString()} | Amount: KSH${req.totalAmount.toFixed(2)}`, 25, yPosition);
    yPosition += 7;
    pdf.text(`Status: ${req.status.toUpperCase()} | Activity: ${req.activity}`, 25, yPosition);
    yPosition += 7;
    
    // Add authorization/approval timestamps
    if (req.authorizedAt) {
      pdf.text(`Authorized: ${new Date(req.authorizedAt).toLocaleDateString()}`, 25, yPosition);
      yPosition += 7;
    }
    if (req.approvedAt) {
      pdf.text(`Approved: ${new Date(req.approvedAt).toLocaleDateString()}`, 25, yPosition);
      yPosition += 7;
    }
    
    // Enhanced document info with clickable link
    if (req.documentUrl && req.documentName) {
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Document: ${req.documentName}`, 25, yPosition);
      yPosition += 5;
      
      // Add clickable link
      pdf.setTextColor(0, 0, 255);
      const linkText = 'View Document';
      pdf.textWithLink(linkText, 25, yPosition, { url: req.documentUrl });
      const textWidth = pdf.getTextWidth(linkText);
      pdf.line(25, yPosition + 1, 25 + textWidth, yPosition + 1);
      pdf.setTextColor(0, 0, 0);
      yPosition += 7;
    }
    
    yPosition += 8;
  });
  
  pdf.save(`requisitions-summary-${new Date().toISOString().split('T')[0]}.pdf`);
};