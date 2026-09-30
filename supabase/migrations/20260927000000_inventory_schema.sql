-- WebRajya POS Step 8: Inventory Foundation Schema & Atomic Stock RPC

-- 1. Ingredient Categories
CREATE TABLE IF NOT EXISTS public.ingredient_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Ingredients
CREATE TABLE IF NOT EXISTS public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.ingredient_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'kg',
  current_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
  minimum_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
  maximum_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Inventory Transactions
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  quantity NUMERIC(12, 3) NOT NULL,
  previous_stock NUMERIC(12, 3) NOT NULL,
  new_stock NUMERIC(12, 3) NOT NULL,
  reason TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Atomic Stock Adjustment Stored Procedure
CREATE OR REPLACE FUNCTION public.adjust_ingredient_stock(
  p_ingredient_id UUID,
  p_quantity NUMERIC,
  p_transaction_type TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_prev_stock NUMERIC;
  v_new_stock NUMERIC;
  v_tx_id UUID;
BEGIN
  SELECT current_stock INTO v_prev_stock
  FROM public.ingredients
  WHERE id = p_ingredient_id
  FOR UPDATE;

  IF v_prev_stock IS NULL THEN
    RAISE EXCEPTION 'Ingredient not found';
  END IF;

  v_new_stock := v_prev_stock + p_quantity;

  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Resulting stock cannot be negative (Current: %, Adjustment: %)', v_prev_stock, p_quantity;
  END IF;

  UPDATE public.ingredients
  SET current_stock = v_new_stock,
      updated_at = now()
  WHERE id = p_ingredient_id;

  INSERT INTO public.inventory_transactions (
    ingredient_id,
    transaction_type,
    quantity,
    previous_stock,
    new_stock,
    reason,
    performed_by
  ) VALUES (
    p_ingredient_id,
    p_transaction_type,
    p_quantity,
    v_prev_stock,
    v_new_stock,
    p_reason,
    auth.uid()
  ) RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
