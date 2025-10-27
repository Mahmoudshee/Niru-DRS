-- Create user role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'approver', 'authoriser', 'staff');

-- Create requisition status enum
CREATE TYPE public.requisition_status AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'pending_authorization', 'authorized', 'completed');

-- Create priority enum
CREATE TYPE public.priority_level AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  signature_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create requisitions table
CREATE TABLE public.requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'CAD',
  department TEXT NOT NULL,
  category TEXT,
  priority priority_level DEFAULT 'medium',
  status requisition_status DEFAULT 'draft',
  justification TEXT,
  expected_delivery_date DATE,
  vendor_name TEXT,
  vendor_contact TEXT,
  approver_id UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  authoriser_id UUID REFERENCES public.profiles(id),
  authorized_at TIMESTAMP WITH TIME ZONE,
  authorization_notes TEXT,
  rejection_reason TEXT,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create requisition_items table for detailed line items
CREATE TABLE public.requisition_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID REFERENCES public.requisitions(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create requisition_attachments table
CREATE TABLE public.requisition_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID REFERENCES public.requisitions(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_attachments ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS app_role[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY_AGG(role)
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles RLS policies
CREATE POLICY "Users can view all user roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Requisitions RLS policies
CREATE POLICY "Users can view requisitions based on role" ON public.requisitions
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id OR
    public.has_role(auth.uid(), 'admin') OR
    (public.has_role(auth.uid(), 'approver') AND status IN ('pending_approval', 'approved', 'rejected', 'pending_authorization', 'authorized', 'completed')) OR
    (public.has_role(auth.uid(), 'authoriser') AND status IN ('approved', 'pending_authorization', 'authorized', 'completed'))
  );

CREATE POLICY "Users can create their own requisitions" ON public.requisitions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own draft requisitions" ON public.requisitions
  FOR UPDATE TO authenticated USING (
    auth.uid() = user_id AND status = 'draft'
  );

CREATE POLICY "Approvers can update requisitions for approval" ON public.requisitions
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'approver') AND status IN ('pending_approval', 'approved', 'rejected')
  );

CREATE POLICY "Authorisers can update requisitions for authorization" ON public.requisitions
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'authoriser') AND status IN ('approved', 'pending_authorization', 'authorized')
  );

CREATE POLICY "Admins can update all requisitions" ON public.requisitions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Requisition items RLS policies
CREATE POLICY "Users can view requisition items they have access to" ON public.requisition_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.requisitions r 
      WHERE r.id = requisition_id AND (
        r.user_id = auth.uid() OR
        public.has_role(auth.uid(), 'admin') OR
        (public.has_role(auth.uid(), 'approver') AND r.status IN ('pending_approval', 'approved', 'rejected', 'pending_authorization', 'authorized', 'completed')) OR
        (public.has_role(auth.uid(), 'authoriser') AND r.status IN ('approved', 'pending_authorization', 'authorized', 'completed'))
      )
    )
  );

CREATE POLICY "Users can manage items for their own requisitions" ON public.requisition_items
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.requisitions r 
      WHERE r.id = requisition_id AND r.user_id = auth.uid() AND r.status = 'draft'
    )
  );

-- Requisition attachments RLS policies
CREATE POLICY "Users can view attachments for accessible requisitions" ON public.requisition_attachments
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.requisitions r 
      WHERE r.id = requisition_id AND (
        r.user_id = auth.uid() OR
        public.has_role(auth.uid(), 'admin') OR
        (public.has_role(auth.uid(), 'approver') AND r.status IN ('pending_approval', 'approved', 'rejected', 'pending_authorization', 'authorized', 'completed')) OR
        (public.has_role(auth.uid(), 'authoriser') AND r.status IN ('approved', 'pending_authorization', 'authorized', 'completed'))
      )
    )
  );

CREATE POLICY "Users can upload attachments to their own requisitions" ON public.requisition_attachments
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM public.requisitions r 
      WHERE r.id = requisition_id AND r.user_id = auth.uid()
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_requisitions_updated_at
  BEFORE UPDATE ON public.requisitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  );
  
  -- Assign default staff role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for tables
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.user_roles REPLICA IDENTITY FULL;
ALTER TABLE public.requisitions REPLICA IDENTITY FULL;
ALTER TABLE public.requisition_items REPLICA IDENTITY FULL;
ALTER TABLE public.requisition_attachments REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.requisitions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.requisition_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.requisition_attachments;

-- Create indexes for better performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_requisitions_user_id ON public.requisitions(user_id);
CREATE INDEX idx_requisitions_status ON public.requisitions(status);
CREATE INDEX idx_requisitions_department ON public.requisitions(department);
CREATE INDEX idx_requisitions_created_at ON public.requisitions(created_at);
CREATE INDEX idx_requisition_items_requisition_id ON public.requisition_items(requisition_id);
CREATE INDEX idx_requisition_attachments_requisition_id ON public.requisition_attachments(requisition_id);