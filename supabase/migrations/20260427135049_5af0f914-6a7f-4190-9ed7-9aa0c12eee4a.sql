
-- Drop existing permissive SELECT policy on employees
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;
DROP POLICY IF EXISTS "Managers can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Managers can update employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;

-- Only admins can manage employee rows
CREATE POLICY "Admins can manage employees"
ON public.employees
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Restrict full SELECT to admins and managers only
CREATE POLICY "Admins and managers can view employees"
ON public.employees
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
);

-- Create a limited public view for cashiers (no salary, deductions, phone, email)
CREATE OR REPLACE VIEW public.employees_public
WITH (security_invoker = on) AS
SELECT
  id,
  name,
  position,
  role,
  status,
  join_date,
  created_at
FROM public.employees;

-- Allow any authenticated user to read the limited view
GRANT SELECT ON public.employees_public TO authenticated;
