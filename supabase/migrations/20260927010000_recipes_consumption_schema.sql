-- WebRajya POS Step 9: Recipes & Idempotent Automatic Inventory Consumption

-- 1. Recipes Table
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  yield_quantity NUMERIC(12, 3) NOT NULL DEFAULT 1.0,
  yield_unit TEXT NOT NULL DEFAULT 'portion',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_active_menu_item_recipe UNIQUE (menu_item_id)
);

-- 2. Recipe Items Table
CREATE TABLE IF NOT EXISTS public.recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 3) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  wastage_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_recipe_ingredient UNIQUE (recipe_id, ingredient_id)
);

-- 3. Inventory Consumptions Table (Idempotency Guarantor)
CREATE TABLE IF NOT EXISTS public.inventory_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'completed',
  consumed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_bill_consumption UNIQUE (bill_id)
);

-- 4. Inventory Consumption Details Table (Historical Audit Chain)
CREATE TABLE IF NOT EXISTS public.inventory_consumption_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumption_id UUID NOT NULL REFERENCES public.inventory_consumptions(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 3) NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Atomic & Idempotent Bill Inventory Consumption Stored Procedure
CREATE OR REPLACE FUNCTION public.process_bill_inventory_consumption(
  p_bill_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_bill_status TEXT;
  v_existing_id UUID;
  v_consumption_id UUID;
  v_bill_item RECORD;
  v_recipe_id UUID;
  v_recipe_item RECORD;
  v_ing_unit TEXT;
  v_unit_factor NUMERIC;
  v_required_qty NUMERIC;
  v_bill_number TEXT;
  v_reason TEXT;
  v_check_item RECORD;
BEGIN
  -- 1. Check existing consumption idempotency
  SELECT id INTO v_existing_id
  FROM public.inventory_consumptions
  WHERE bill_id = p_bill_id;

  IF v_existing_id IS NOT NULL THEN
    RETURN true;
  END IF;

  -- 2. Verify bill status = 'paid'
  SELECT status, bill_number INTO v_bill_status, v_bill_number
  FROM public.bills
  WHERE id = p_bill_id;

  IF v_bill_status IS NULL THEN
    RAISE EXCEPTION 'Bill not found';
  END IF;

  IF v_bill_status != 'paid' THEN
    RAISE EXCEPTION 'Inventory consumption requires bill status to be paid (Current: %)', v_bill_status;
  END IF;

  -- Temp table for aggregating required ingredient quantities for this bill
  CREATE TEMP TABLE IF NOT EXISTS temp_bill_consumption (
    ingredient_id UUID PRIMARY KEY,
    required_qty NUMERIC(12, 3) DEFAULT 0,
    unit TEXT NOT NULL
  ) ON COMMIT DROP;

  DELETE FROM temp_bill_consumption;

  -- 3. Resolve bill items -> order items -> menu items -> recipes -> ingredients
  FOR v_bill_item IN
    SELECT oi.menu_item_id, bi.quantity, COALESCE(oi.is_complimentary, false) AS is_complimentary
    FROM public.bill_items bi
    JOIN public.order_items oi ON oi.id = bi.order_item_id
    WHERE bi.bill_id = p_bill_id
      AND (oi.is_complimentary IS NOT TRUE)
      AND oi.menu_item_id IS NOT NULL
  LOOP
    -- Find active recipe for menu item
    SELECT id INTO v_recipe_id
    FROM public.recipes
    WHERE menu_item_id = v_bill_item.menu_item_id AND is_active = true;

    IF v_recipe_id IS NOT NULL THEN
      FOR v_recipe_item IN
        SELECT ingredient_id, quantity, unit, wastage_percent
        FROM public.recipe_items
        WHERE recipe_id = v_recipe_id
      LOOP
        SELECT unit INTO v_ing_unit
        FROM public.ingredients
        WHERE id = v_recipe_item.ingredient_id AND is_active = true;

        IF v_ing_unit IS NOT NULL THEN
          -- Unit conversion factors
          v_unit_factor := 1.0;
          IF v_recipe_item.unit = 'g' AND v_ing_unit = 'kg' THEN
            v_unit_factor := 0.001;
          ELSIF v_recipe_item.unit = 'kg' AND v_ing_unit = 'g' THEN
            v_unit_factor := 1000.0;
          ELSIF v_recipe_item.unit = 'ml' AND v_ing_unit = 'l' THEN
            v_unit_factor := 0.001;
          ELSIF v_recipe_item.unit = 'l' AND v_ing_unit = 'ml' THEN
            v_unit_factor := 1000.0;
          ELSIF v_recipe_item.unit != v_ing_unit THEN
            RAISE EXCEPTION 'Incompatible units between recipe (%) and ingredient stock (%)', v_recipe_item.unit, v_ing_unit;
          END IF;

          -- Wastage applied exactly once
          v_required_qty := v_bill_item.quantity * (v_recipe_item.quantity * (1.0 + (v_recipe_item.wastage_percent / 100.0))) * v_unit_factor;

          INSERT INTO temp_bill_consumption (ingredient_id, required_qty, unit)
          VALUES (v_recipe_item.ingredient_id, v_required_qty, v_ing_unit)
          ON CONFLICT (ingredient_id)
          DO UPDATE SET required_qty = temp_bill_consumption.required_qty + EXCLUDED.required_qty;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- 4. Atomic concurrency check & stock sufficiency validation with row locking
  FOR v_check_item IN
    SELECT c.ingredient_id, c.required_qty, i.name, i.current_stock
    FROM temp_bill_consumption c
    JOIN public.ingredients i ON i.id = c.ingredient_id
    FOR UPDATE OF i
  LOOP
    IF v_check_item.current_stock < v_check_item.required_qty THEN
      RAISE EXCEPTION 'Insufficient stock for % (Required: %, Available: %)',
        v_check_item.name, v_check_item.required_qty, v_check_item.current_stock;
    END IF;
  END LOOP;

  -- 5. Insert consumption record using ON CONFLICT for concurrency safety
  INSERT INTO public.inventory_consumptions (bill_id, status, consumed_by)
  VALUES (p_bill_id, 'completed', auth.uid())
  ON CONFLICT (bill_id) DO NOTHING
  RETURNING id INTO v_consumption_id;

  -- If concurrent request inserted first, return true safely
  IF v_consumption_id IS NULL THEN
    RETURN true;
  END IF;

  -- 6. Record historical consumption items and deduct stock atomically
  v_reason := 'Automatic consumption for Bill #' || COALESCE(v_bill_number, p_bill_id::text);

  FOR v_check_item IN
    SELECT ingredient_id, required_qty, unit
    FROM temp_bill_consumption
  LOOP
    -- Historical detail snapshot
    INSERT INTO public.inventory_consumption_items (consumption_id, ingredient_id, quantity, unit)
    VALUES (v_consumption_id, v_check_item.ingredient_id, v_check_item.required_qty, v_check_item.unit);

    -- Atomic stock deduction
    PERFORM public.adjust_ingredient_stock(
      v_check_item.ingredient_id,
      -v_check_item.required_qty,
      'consumption',
      v_reason
    );
  END LOOP;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
