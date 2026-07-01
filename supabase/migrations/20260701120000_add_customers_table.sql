-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Policies for customers table
CREATE POLICY "Enable read access for authenticated users"
  ON public.customers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Enable insert for admin and manager"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'authenticated' AND EXISTS (
    SELECT 1 FROM public.employees 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

CREATE POLICY "Enable update for admin and manager"
  ON public.customers FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employees 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.employees 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  ));

CREATE POLICY "Enable delete for admin only"
  ON public.customers FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employees 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Add customer_id column to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Create index for phone lookup
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_full_name ON public.customers(full_name);
