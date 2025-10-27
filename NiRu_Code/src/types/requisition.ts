
export interface RequisitionItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  [key: string]: any; // Add index signature for Json compatibility
}

export interface Requisition {
  id: string;
  staffId: string;
  staffName: string;
  staffEmail: string;
  date: string;
  activity: string;
  totalAmount: number;
  items: RequisitionItem[];
  status: 'pending' | 'authorized' | 'approved' | 'rejected';
  authoriserNotes?: string;
  approverNotes?: string;
  createdAt: string;
  authorizedAt?: string;
  approvedAt?: string;
  // Document attachment (legacy single document)
  documentUrl?: string;
  documentName?: string;
  // Multiple document attachments (new format)
  documentUrls?: string; // JSON string of array
  documentNames?: string; // JSON string of array
  // Liquidation fields
  liquidation_status?: 'liquidated' | 'not_liquidated' | 'not_applicable';
  liquidatedby?: string;
  liquidatedat?: string;
  // Audit fields
  archived: boolean;
  archivedBy?: string;
  archivedAt?: string;
  archiveReason?: string;
  // Edit tracking
  originalRequisitionId?: string;
  editedFrom?: string;
}

export interface AuditLog {
  id: string;
  requisitionId: string;
  action: 'created' | 'authorized' | 'approved' | 'rejected' | 'archived' | 'status_changed' | 'permanently_deleted';
  performedBy: string;
  performedByRole: 'staff' | 'authoriser' | 'approver' | 'admin';
  previousValue?: string;
  newValue?: string;
  notes?: string;
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: UserRole[]; // Changed from single role to array of roles
}

export type UserRole = 'staff' | 'authoriser' | 'approver' | 'admin';
