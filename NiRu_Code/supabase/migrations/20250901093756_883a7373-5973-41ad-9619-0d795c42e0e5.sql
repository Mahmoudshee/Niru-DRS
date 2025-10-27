-- Add user-specific hidden tracking for archived requisitions
CREATE TABLE IF NOT EXISTS public.user_hidden_requisitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    requisition_id TEXT NOT NULL,
    hidden_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, requisition_id)
);

-- Enable RLS
ALTER TABLE public.user_hidden_requisitions ENABLE ROW LEVEL SECURITY;

-- Create policies for user-specific hidden tracking
CREATE POLICY "Users can view their own hidden requisitions" 
ON public.user_hidden_requisitions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own hidden requisitions" 
ON public.user_hidden_requisitions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own hidden requisitions" 
ON public.user_hidden_requisitions 
FOR DELETE 
USING (auth.uid() = user_id);