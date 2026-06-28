
-- Drop the overly permissive insert policies
DROP POLICY "Authenticated users can create orders" ON public.orders;
DROP POLICY "Authenticated users can insert order items" ON public.order_items;

-- Recreate with proper scoping
CREATE POLICY "Authenticated users can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (cashier_id = auth.uid());
CREATE POLICY "Authenticated users can insert order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND cashier_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
);
