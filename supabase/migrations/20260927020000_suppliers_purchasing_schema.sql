-- WebRajya POS Step 10: Suppliers & Purchasing Schema and Atomic Receiving RPC

-- 1. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Purchase Number Sequence
CREATE SEQUENCE IF NOT EXISTS public.purchase_number_seq START WITH 1001;

CREATE OR REPLACE FUNCTION public.generate_purchase_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'PUR-' || nextval('public.purchase_number_seq')::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 3. Purchases Table
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number TEXT NOT NULL UNIQUE DEFAULT public.generate_purchase_number(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'partially_received', 'received', 'cancelled')),
  invoice_number TEXT,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  rounding_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at TIMESTAMPTZ,
  received_by UUID REFERENCES auth.users(id),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  cancellation_reason TEXT
);

-- 4. Purchase Items Table
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
  line_total NUMERIC(12, 2) NOT NULL,
  received_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON public.purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON public.purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON public.purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_ingredient_id ON public.purchase_items(ingredient_id);

-- 6. Atomic & Idempotent Purchase Receiving Stored Procedure
CREATE OR REPLACE FUNCTION public.receive_purchase(
  p_purchase_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_purchase RECORD;
  v_item RECORD;
  v_ing RECORD;
  v_unit_factor NUMERIC;
  v_stock_increase NUMERIC;
  v_reason TEXT;
BEGIN
  -- 1. Lock purchase row FOR UPDATE to guarantee concurrency isolation
  SELECT * INTO v_purchase
  FROM public.purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF v_purchase.id IS NULL THEN
    RAISE EXCEPTION 'Purchase not found';
  END IF;

  -- 2. Idempotency Check: If already received, return true without double increasing stock
  IF v_purchase.status = 'received' THEN
    RETURN true;
  END IF;

  IF v_purchase.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot receive a cancelled purchase';
  END IF;

  IF v_purchase.status NOT IN ('draft', 'ordered', 'partially_received') THEN
    RAISE EXCEPTION 'Purchase cannot be received from state: %', v_purchase.status;
  END IF;

  -- 3. Validate items presence
  IF NOT EXISTS (SELECT 1 FROM public.purchase_items WHERE purchase_id = p_purchase_id) THEN
    RAISE EXCEPTION 'Cannot receive a purchase with no items';
  END IF;

  -- 4. Process all items atomically (No partial receiving)
  v_reason := 'Purchase ' || COALESCE(v_purchase.purchase_number, p_purchase_id::text) || ' received';

  FOR v_item IN
    SELECT id, ingredient_id, quantity, unit
    FROM public.purchase_items
    WHERE purchase_id = p_purchase_id
  LOOP
    -- Validate ingredient is active and exists
    SELECT id, unit, is_active INTO v_ing
    FROM public.ingredients
    WHERE id = v_item.ingredient_id;

    IF v_ing.id IS NULL THEN
      RAISE EXCEPTION 'Ingredient not found for purchase item';
    END IF;

    IF NOT v_ing.is_active THEN
      RAISE EXCEPTION 'Ingredient is inactive and cannot receive stock';
    END IF;

    -- Unit conversion factors
    v_unit_factor := 1.0;
    IF v_item.unit = 'g' AND v_ing.unit = 'kg' THEN
      v_unit_factor := 0.001;
    ELSIF v_item.unit = 'kg' AND v_ing.unit = 'g' THEN
      v_unit_factor := 1000.0;
    ELSIF v_item.unit = 'ml' AND v_ing.unit = 'l' THEN
      v_unit_factor := 0.001;
    ELSIF v_item.unit = 'l' AND v_ing.unit = 'ml' THEN
      v_unit_factor := 1000.0;
    ELSIF v_item.unit != v_ing.unit THEN
      RAISE EXCEPTION 'Incompatible units between purchase item (%) and ingredient stock (%)', v_item.unit, v_ing.unit;
    END IF;

    v_stock_increase := v_item.quantity * v_unit_factor;

    -- Update purchase item received_quantity
    UPDATE public.purchase_items
    SET received_quantity = v_item.quantity,
        updated_at = now()
    WHERE id = v_item.id;

    -- Atomic ingredient stock increase and transaction creation
    PERFORM public.adjust_ingredient_stock(
      v_item.ingredient_id,
      v_stock_increase,
      'purchase',
      v_reason
    );
  END LOOP;

  -- 5. Update purchase status to received
  UPDATE public.purchases
  SET status = 'received',
      received_at = now(),
      received_by = auth.uid(),
      updated_at = now()
  WHERE id = p_purchase_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 7. Purchase Cancellation Stored Procedure
CREATE OR REPLACE FUNCTION public.cancel_purchase(
  p_purchase_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_purchase RECORD;
BEGIN
  SELECT * INTO v_purchase
  FROM public.purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF v_purchase.id IS NULL THEN
    RAISE EXCEPTION 'Purchase not found';
  END IF;

  IF v_purchase.status = 'cancelled' THEN
    RETURN true;
  END IF;

  IF v_purchase.status = 'received' THEN
    RAISE EXCEPTION 'Purchase cannot be cancelled after receiving';
  END IF;

  UPDATE public.purchases
  SET status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = auth.uid(),
      cancellation_reason = p_reason,
      updated_at = now()
  WHERE id = p_purchase_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
