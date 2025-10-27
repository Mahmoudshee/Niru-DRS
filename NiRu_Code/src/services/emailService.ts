
import emailjs from '@emailjs/browser';
import { supabase } from '@/integrations/supabase/client';

// EmailJS Configuration (from your working setup)
const EMAILJS_CONFIG = {
  publicKey: "GR8AEvUByroVMK8cU",
  serviceId: "service_wjolt3n", 
  templateId: "template_xoj1e29"
};

// Email addresses for different roles
const ROLE_EMAILS = {
  staff: "kenty.drew8914@gmail.com",
  authoriser: ["mahmoudhussein8975@gmail.com.ca"],
  approver: ["kentydrew8914@gmail.com"]
};

// Initialize EmailJS
emailjs.init(EMAILJS_CONFIG.publicKey);

// Action link pointing to your app
const ACTION_LINK = `<a href="${window.location.origin}" target="_blank" style="color:#007bff;text-decoration:underline;">take action</a>`;

export interface EmailNotification {
  to: string;
  subject: string;
  message: string;
  timestamp: string;
}

class EmailService {
  private notifications: EmailNotification[] = [];

  // Send email using EmailJS (your working logic)
  async sendEmail(to: string | string[], subject: string, body: string): Promise<boolean> {
    // Handle multiple recipients
    const recipients = Array.isArray(to) ? to : [to];
    let allSent = true;
    
    for (const recipient of recipients) {
      const params = {
        To: recipient, // Match your EmailJS template field name
        subject: subject,
        message: body,
      };

      try {
        const response = await emailjs.send(
          EMAILJS_CONFIG.serviceId, 
          EMAILJS_CONFIG.templateId, 
          params
        );
        
        console.log("Email sent successfully to", recipient, response);
        
        // Log notification for tracking
        const notification: EmailNotification = {
          to: recipient,
          subject,
          message: body,
          timestamp: new Date().toISOString()
        };
        this.notifications.push(notification);
      } catch (error) {
        console.error("Email send error to", recipient, error);
        allSent = false;
      }
    }
    
    this.saveNotifications();
    return allSent;
  }

  // Fetch staff email from profiles table
  private async getStaffEmail(staffId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', staffId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching staff email:', error);
        return ROLE_EMAILS.staff; // fallback
      }
      
      return data?.email || ROLE_EMAILS.staff;
    } catch (error) {
      console.error('Error fetching staff email:', error);
      return ROLE_EMAILS.staff; // fallback
    }
  }

  // Send notification based on role and status (following your workflow logic)
  async sendRequisitionNotification(
    action: 'submitted' | 'authorized' | 'approved' | 'rejected',
    requisitionDetails: {
      id: string;
      staffId: string;
      staffName: string;
      staffEmail?: string;
      activity: string;
      totalAmount: number;
    },
    performedByRole?: 'authoriser' | 'approver'
  ) {
    let to: string | string[];
    let subject: string;
    let message: string;

    switch (action) {
      case 'submitted':
        // Staff submits → Notify authoriser
        to = ROLE_EMAILS.authoriser;
        subject = "New Requisition Submitted";
        message = `A new requisition has been submitted by ${requisitionDetails.staffName}. 
                   Activity: ${requisitionDetails.activity}
                   Amount: ksh ${requisitionDetails.totalAmount}
                   Please ${ACTION_LINK} to review.`;
        break;

      case 'authorized':
        // Authoriser approves → Notify approver
        to = ROLE_EMAILS.approver;
        subject = "Requisition Approved by Authoriser";
        message = `A requisition has been approved by the authoriser.
                   Staff: ${requisitionDetails.staffName}
                   Activity: ${requisitionDetails.activity}
                   Amount: ksh ${requisitionDetails.totalAmount}
                   Please review and ${ACTION_LINK}.`;
        break;

      case 'rejected':
        // Rejected by authoriser or approver → Notify staff
        to = requisitionDetails.staffEmail || await this.getStaffEmail(requisitionDetails.staffId);
        subject = `Requisition Rejected by ${performedByRole === 'authoriser' ? 'Authoriser' : 'Approver'}`;
        message = `Your requisition was rejected by the ${performedByRole}.
                   Activity: ${requisitionDetails.activity}
                   Amount: ksh ${requisitionDetails.totalAmount}
                   Please ${ACTION_LINK} to view details.`;
        break;

      case 'approved':
        // Final approval by approver → Notify staff
        to = requisitionDetails.staffEmail || await this.getStaffEmail(requisitionDetails.staffId);
        subject = "Requisition Approved by Approver";
        message = `Your requisition has been fully approved!
                   Activity: ${requisitionDetails.activity}
                   Amount: ksh ${requisitionDetails.totalAmount}
                   Please ${ACTION_LINK} to view details.`;
        break;

      default:
        return false;
    }

    return await this.sendEmail(to, subject, message);
  }

  // Legacy method for backward compatibility
  async sendNotification(to: string, subject: string, message: string) {
    return await this.sendEmail(to, subject, message);
  }

  // Get all notifications (for admin view)
  getAllNotifications(): EmailNotification[] {
    const saved = localStorage.getItem('emailNotifications');
    return saved ? JSON.parse(saved) : [];
  }

  // Clear notification history
  clearNotifications() {
    this.notifications = [];
    localStorage.removeItem('emailNotifications');
  }

  private saveNotifications() {
    localStorage.setItem('emailNotifications', JSON.stringify(this.notifications));
  }
}

export const emailService = new EmailService();
