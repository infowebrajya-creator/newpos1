-- SQL Script: Enable ON DELETE CASCADE for Bills and Order Items
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard) to allow deleting orders without foreign key errors.

BEGIN;

-- 1. Drop existing RESTRICT foreign key on bills (order_id)
ALTER TABLE public.bills 
  DROP CONSTRAINT IF EXISTS bills_order_id_fkey;

-- 2. Add ON DELETE CASCADE foreign key on bills (order_id)
ALTER TABLE public.bills
  ADD CONSTRAINT bills_order_id_fkey 
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- 3. Drop existing RESTRICT foreign key on bill_items (order_item_id) if any
ALTER TABLE public.bill_items 
  DROP CONSTRAINT IF EXISTS bill_items_order_item_id_fkey;

-- 4. Add ON DELETE SET NULL / CASCADE foreign key on bill_items
ALTER TABLE public.bill_items
  ADD CONSTRAINT bill_items_order_item_id_fkey 
  FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE SET NULL;

COMMIT;
