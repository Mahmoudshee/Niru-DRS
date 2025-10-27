-- Enable real-time replication for the requisitions table
ALTER TABLE public.requisitions REPLICA IDENTITY FULL;

-- Add the requisitions table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.requisitions;

-- Enable real-time replication for the audit_logs table
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;

-- Add the audit_logs table to the realtime publication  
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;