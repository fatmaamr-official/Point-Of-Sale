
-- Fix: Prevent managers from assigning admin role
DROP POLICY "Managers can insert employees" ON public.employees;
DROP POLICY "Managers can update employees" ON public.employees;

CREATE POLICY "Managers can insert employees" ON public.employees FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager') AND role <> 'admin'::app_role);
CREATE POLICY "Managers can update employees" ON public.employees FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'manager') AND role <> 'admin'::app_role);
