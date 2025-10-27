-- Database Diagnostic Script
-- Run this in your Supabase SQL Editor to check if tables exist and are properly configured

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'requisitions', 'audit_logs', 'user_hidden_requisitions');

-- Check requisitions table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'requisitions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'requisitions', 'audit_logs', 'user_hidden_requisitions');

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'requisitions', 'audit_logs', 'user_hidden_requisitions');

-- Test basic query
SELECT COUNT(*) as requisitions_count FROM public.requisitions;
SELECT COUNT(*) as profiles_count FROM public.profiles;
