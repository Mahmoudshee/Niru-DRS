-- Enable real-time updates for requisitions table
ALTER TABLE public.requisitions REPLICA IDENTITY FULL;

-- Add the requisitions table to the realtime publication
ALTER publication supabase_realtime ADD TABLE public.requisitions;

-- Enable real-time updates for audit_logs table
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;

-- Add the audit_logs table to the realtime publication
ALTER publication supabase_realtime ADD TABLE public.audit_logs;