-- Enable real-time for requisitions table
ALTER TABLE public.requisitions REPLICA IDENTITY FULL;

-- Enable real-time for audit_logs table  
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.requisitions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;