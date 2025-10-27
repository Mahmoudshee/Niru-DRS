-- SQL Commands to assign multiple roles to users

-- 1. First, add the roles column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS roles text[] DEFAULT ARRAY['staff'];

-- 2. Update existing users to have roles array (convert single role to array)
UPDATE profiles 
SET roles = ARRAY[role] 
WHERE roles IS NULL;

-- 3. Examples: Assign multiple roles to specific users

-- Make Alice Admin have all roles
UPDATE profiles 
SET roles = ARRAY['admin', 'authoriser', 'approver', 'staff']
WHERE email = 'admin@elimu.ca';

-- Make a staff member also an authoriser
UPDATE profiles 
SET roles = ARRAY['staff', 'authoriser']
WHERE email = 'somestaff@elimu.ca';

-- Make someone both authoriser and approver
UPDATE profiles 
SET roles = ARRAY['authoriser', 'approver']
WHERE email = 'manager@elimu.ca';

-- View all users and their roles
SELECT name, email, roles FROM profiles;