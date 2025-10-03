-- Phase 1: Secure the services, liquidacoes, and profiles tables
-- Drop overly permissive policies that allow public access

DROP POLICY IF EXISTS "Allow all operations on services" ON public.services;
DROP POLICY IF EXISTS "Allow all operations on liquidacoes" ON public.liquidacoes;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create authenticated-only policies for services table
CREATE POLICY "Authenticated users can view services" 
ON public.services 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert services" 
ON public.services 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update services" 
ON public.services 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete services" 
ON public.services 
FOR DELETE 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Create authenticated-only policies for liquidacoes table
CREATE POLICY "Authenticated users can view liquidacoes" 
ON public.liquidacoes 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert liquidacoes" 
ON public.liquidacoes 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update liquidacoes" 
ON public.liquidacoes 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete liquidacoes" 
ON public.liquidacoes 
FOR DELETE 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Update profiles policy to only allow users to view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);