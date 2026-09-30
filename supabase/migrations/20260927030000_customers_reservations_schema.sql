-- WebRajya POS Step 11: Customers & Reservations Schema and Atomic RPCs

-- 1. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Reservation Number Sequence
CREATE SEQUENCE IF NOT EXISTS public.reservation_number_seq START WITH 1001;

CREATE OR REPLACE FUNCTION public.generate_reservation_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'RES-' || nextval('public.reservation_number_seq')::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 3. Reservations Table
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_number TEXT NOT NULL UNIQUE DEFAULT public.generate_reservation_number(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE RESTRICT,
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  guest_count INTEGER NOT NULL CHECK (guest_count > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  cancellation_reason TEXT,
  seated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_reservation_time_range CHECK (start_time < end_time)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON public.reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_table_id ON public.reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON public.reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_number ON public.reservations(reservation_number);

-- 5. Atomic Reservation Creation Stored Procedure
CREATE OR REPLACE FUNCTION public.create_reservation(
  p_customer_id UUID,
  p_table_id UUID,
  p_reservation_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_guest_count INTEGER,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_cust RECORD;
  v_table RECORD;
  v_res_id UUID;
BEGIN
  -- 1. Validate customer
  SELECT id, is_active INTO v_cust
  FROM public.customers
  WHERE id = p_customer_id;

  IF v_cust.id IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF NOT v_cust.is_active THEN
    RAISE EXCEPTION 'Cannot create reservation for inactive customer';
  END IF;

  -- 2. Validate table & capacity with row lock FOR UPDATE to prevent race conditions
  SELECT id, capacity, is_active INTO v_table
  FROM public.restaurant_tables
  WHERE id = p_table_id
  FOR UPDATE;

  IF v_table.id IS NULL THEN
    RAISE EXCEPTION 'Table not found';
  END IF;

  IF NOT v_table.is_active THEN
    RAISE EXCEPTION 'Table is inactive and unavailable for reservations';
  END IF;

  IF p_guest_count <= 0 THEN
    RAISE EXCEPTION 'Guest count must be greater than 0';
  END IF;

  IF p_guest_count > v_table.capacity THEN
    RAISE EXCEPTION 'Guest count (%) exceeds table capacity (%)', p_guest_count, v_table.capacity;
  END IF;

  IF p_start_time >= p_end_time THEN
    RAISE EXCEPTION 'Reservation end time must be after start time';
  END IF;

  IF p_reservation_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Reservation date cannot be in the past';
  END IF;

  -- 3. Overlap check for selected table and time slot
  IF EXISTS (
    SELECT 1 FROM public.reservations
    WHERE table_id = p_table_id
      AND reservation_date = p_reservation_date
      AND status IN ('pending', 'confirmed', 'seated')
      AND start_time < p_end_time
      AND end_time > p_start_time
  ) THEN
    RAISE EXCEPTION 'Table is already reserved for the selected time slot';
  END IF;

  -- 4. Create reservation
  INSERT INTO public.reservations (
    customer_id,
    table_id,
    reservation_date,
    start_time,
    end_time,
    guest_count,
    notes,
    status,
    created_by
  ) VALUES (
    p_customer_id,
    p_table_id,
    p_reservation_date,
    p_start_time,
    p_end_time,
    p_guest_count,
    p_notes,
    'pending',
    auth.uid()
  ) RETURNING id INTO v_res_id;

  RETURN v_res_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 6. Confirm Reservation RPC
CREATE OR REPLACE FUNCTION public.confirm_reservation(
  p_reservation_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_res RECORD;
BEGIN
  SELECT * INTO v_res
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF v_res.id IS NULL THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  IF v_res.status = 'confirmed' THEN
    RETURN true;
  END IF;

  IF v_res.status != 'pending' THEN
    RAISE EXCEPTION 'Cannot confirm reservation from status: %', v_res.status;
  END IF;

  UPDATE public.reservations
  SET status = 'confirmed',
      confirmed_at = now(),
      updated_at = now()
  WHERE id = p_reservation_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 7. Cancel Reservation RPC
CREATE OR REPLACE FUNCTION public.cancel_reservation(
  p_reservation_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_res RECORD;
BEGIN
  SELECT * INTO v_res
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF v_res.id IS NULL THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  IF v_res.status = 'cancelled' THEN
    RETURN true;
  END IF;

  IF v_res.status IN ('completed', 'seated') THEN
    RAISE EXCEPTION 'Cannot cancel a seated or completed reservation';
  END IF;

  UPDATE public.reservations
  SET status = 'cancelled',
      cancellation_reason = p_reason,
      cancelled_at = now(),
      cancelled_by = auth.uid(),
      updated_at = now()
  WHERE id = p_reservation_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 8. Mark Reservation No-Show RPC
CREATE OR REPLACE FUNCTION public.mark_reservation_no_show(
  p_reservation_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_res RECORD;
BEGIN
  SELECT * INTO v_res
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF v_res.id IS NULL THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  IF v_res.status = 'no_show' THEN
    RETURN true;
  END IF;

  IF v_res.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Cannot mark reservation as no-show from status: %', v_res.status;
  END IF;

  UPDATE public.reservations
  SET status = 'no_show',
      updated_at = now()
  WHERE id = p_reservation_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 9. Atomic Seat Reservation Stored Procedure
CREATE OR REPLACE FUNCTION public.seat_reservation(
  p_reservation_id UUID
) RETURNS UUID AS $$
DECLARE
  v_res RECORD;
  v_table RECORD;
  v_existing_session_id UUID;
  v_session_id UUID;
BEGIN
  -- 1. Lock reservation row FOR UPDATE
  SELECT * INTO v_res
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF v_res.id IS NULL THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  -- If already seated, return active table session if present
  IF v_res.status = 'seated' THEN
    SELECT id INTO v_existing_session_id
    FROM public.table_sessions
    WHERE table_id = v_res.table_id AND status = 'open'
    LIMIT 1;

    IF v_existing_session_id IS NOT NULL THEN
      RETURN v_existing_session_id;
    END IF;
  END IF;

  IF v_res.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Reservation cannot be seated from status: %', v_res.status;
  END IF;

  -- 2. Lock table row FOR UPDATE and verify availability
  SELECT id, status INTO v_table
  FROM public.restaurant_tables
  WHERE id = v_res.table_id
  FOR UPDATE;

  IF v_table.id IS NULL THEN
    RAISE EXCEPTION 'Table not found';
  END IF;

  IF v_table.status IN ('occupied', 'payment_pending', 'out_of_service') THEN
    RAISE EXCEPTION 'Table is currently occupied or unavailable for seating';
  END IF;

  -- Safety check for existing open session
  SELECT id INTO v_existing_session_id
  FROM public.table_sessions
  WHERE table_id = v_res.table_id AND status = 'open'
  LIMIT 1;

  IF v_existing_session_id IS NOT NULL THEN
    RAISE EXCEPTION 'Table is currently occupied';
  END IF;

  -- 3. Open table session with customer_id link
  INSERT INTO public.table_sessions (
    table_id,
    customer_id,
    guest_count,
    status,
    opened_by,
    opened_at
  ) VALUES (
    v_res.table_id,
    v_res.customer_id,
    v_res.guest_count,
    'open',
    auth.uid(),
    now()
  ) RETURNING id INTO v_session_id;

  -- 4. Mark table status = occupied
  UPDATE public.restaurant_tables
  SET status = 'occupied',
      updated_at = now()
  WHERE id = v_res.table_id;

  -- 5. Mark reservation status = seated
  UPDATE public.reservations
  SET status = 'seated',
      seated_at = now(),
      updated_at = now()
  WHERE id = p_reservation_id;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
