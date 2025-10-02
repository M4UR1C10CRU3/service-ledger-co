-- Remove the overly permissive policy on backups table that allows public access
DROP POLICY IF EXISTS "Allow all operations on backups" ON public.backups;

-- The backups table will now be private by default (RLS is enabled but no policies allow public access)
-- The backup-services edge function will continue to work because it uses the service role key which bypasses RLS

-- Note: If admin users need to view backups in the future, create a user_roles system 
-- and add a policy like: "Admins can view backups" with condition: has_role(auth.uid(), 'admin')