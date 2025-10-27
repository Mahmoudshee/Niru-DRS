-- Add database indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_requisitions_staff_status ON requisitions(staffId, status) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_requisitions_created_at ON requisitions(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_requisitions_staff_archived ON requisitions(staffId, archived);
CREATE INDEX IF NOT EXISTS idx_requisitions_liquidation ON requisitions(status, liquidation_status) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_audit_logs_requisition ON audit_logs(requisitionId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);