-- ============================================
-- THE XINGS KITCHEN - LATEST UPDATED MENU SCRIPT
-- Run this in Supabase SQL Editor to replace old menu items with the latest menu.
-- ============================================

BEGIN;

-- 1. CLEAN RESET OF EXISTING MENU ITEMS & CATEGORIES
DELETE FROM public.kot_items;
DELETE FROM public.order_items;
DELETE FROM public.bill_items;
DELETE FROM public.menu_items;
DELETE FROM public.menu_categories;

-- 2. INSERT 13 MENU CATEGORIES
INSERT INTO public.menu_categories (id, name, display_order, is_active)
VALUES
  ('c1010000-0000-0000-0000-000000000001', 'PANEER STARTER', 1, true),
  ('c1010000-0000-0000-0000-000000000002', 'CORN STORY', 2, true),
  ('c1010000-0000-0000-0000-000000000003', 'MUSHROOM', 3, true),
  ('c1010000-0000-0000-0000-000000000004', 'POTATOES', 4, true),
  ('c1010000-0000-0000-0000-000000000005', 'SOUP', 5, true),
  ('c1010000-0000-0000-0000-000000000006', 'CRISPY FRIES', 6, true),
  ('c1010000-0000-0000-0000-000000000007', 'CRISPY STARTER', 7, true),
  ('c1010000-0000-0000-0000-000000000008', 'VEG NOODLES', 8, true),
  ('c1010000-0000-0000-0000-000000000009', 'RICE BOWL', 9, true),
  ('c1010000-0000-0000-0000-000000000010', 'PANEER RICE', 10, true),
  ('c1010000-0000-0000-0000-000000000011', 'VEG PULAO', 11, true),
  ('c1010000-0000-0000-0000-000000000012', 'COMBO', 12, true),
  ('c1010000-0000-0000-0000-000000000013', '3 COURSE MEAL', 13, true);

-- 3. INSERT MENU ITEMS FOR EACH CATEGORY

-- Category 1: PANEER STARTER (₹129)
INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
  ('c1010000-0000-0000-0000-000000000001', 'Paneer Chilly', 129.00, true, true),
  ('c1010000-0000-0000-0000-000000000001', 'Dragon Paneer', 129.00, true, true),
  ('c1010000-0000-0000-0000-000000000001', 'Paneer Manchurian', 129.00, true, true),
  ('c1010000-0000-0000-0000-000000000001', 'Lemon Paneer', 129.00, true, true),
  ('c1010000-0000-0000-0000-000000000001', 'Paneer Stick', 129.00, true, true),
  ('c1010000-0000-0000-0000-000000000001', 'Garlic Paneer', 129.00, true, true),
  ('c1010000-0000-0000-0000-000000000001', 'Paneer Black Pepper', 129.00, true, true),
  ('c1010000-0000-0000-0000-000000000001', 'Paneer 65', 129.00, true, true),
  ('c1010000-0000-0000-0000-000000000001', 'Thread Paneer', 129.00, true, true),
  ('c1010000-0000-0000-0000-000000000001', 'Paneer Kumkum', 129.00, true, true),
  ('c1010000-0000-0000-0000-000000000001', 'Paneer Majestic', 129.00, true, true);

-- Category 2: CORN STORY (₹99)
INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
  ('c1010000-0000-0000-0000-000000000002', 'Crispy Corn', 99.00, true, true),
  ('c1010000-0000-0000-0000-000000000002', 'Chilly Baby Corn', 99.00, true, true);

-- Category 3: MUSHROOM (₹129)
INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
  ('c1010000-0000-0000-0000-000000000003', 'Mushroom Chilli', 129.00, true, true),
  ('c1010000-0000-0000-0000-000000000003', 'Mushroom Fried Rice', 129.00, true, true);

-- Category 4: POTATOES (₹99 / ₹129)
INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
  ('c1010000-0000-0000-0000-000000000004', 'Chilli Potato', 99.00, true, true),
  ('c1010000-0000-0000-0000-000000000004', 'Honey Chilli Potato', 129.00, true, true);

-- Category 5: SOUP (₹49)
INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
  ('c1010000-0000-0000-0000-000000000005', 'Veg Manchow Soup', 49.00, true, true),
  ('c1010000-0000-0000-0000-000000000005', 'Veg Hot & Sour Soup', 49.00, true, true),
  ('c1010000-0000-0000-0000-000000000005', 'Veg Sweet Corn Soup', 49.00, true, true),
  ('c1010000-0000-0000-0000-000000000005', 'Lemon Coriander Soup', 49.00, true, true),
  ('c1010000-0000-0000-0000-000000000005', 'Onion Garlic Soup', 49.00, true, true);

-- Category 6: CRISPY FRIES (₹49 / ₹59)
INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
  ('c1010000-0000-0000-0000-000000000006', 'French Fries', 49.00, true, true),
  ('c1010000-0000-0000-0000-000000000006', 'Peri Peri French Fries', 59.00, true, true);

-- Category 7: CRISPY STARTER (₹99)
INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
  ('c1010000-0000-0000-0000-000000000007', 'Crispy Veg', 99.00, true, true),
  ('c1010000-0000-0000-0000-000000000007', 'Crispy Corn', 99.00, true, true),
  ('c1010000-0000-0000-0000-000000000007', 'Veg Lollipop', 99.00, true, true),
  ('c1010000-0000-0000-0000-000000000007', 'Veg Manchurian', 99.00, true, true);

-- Category 8: VEG NOODLES (₹99)
INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
  ('c1010000-0000-0000-0000-000000000008', 'Veg Hakka Noodles', 99.00, true, true),
  ('c1010000-0000-0000-0000-000000000008', 'Veg Schezwan Noodles', 99.00, true, true),
  ('c1010000-0000-0000-0000-000000000008', 'Veg Chilly Noodles', 99.00, true, true),
  ('c1010000-0000-0000-0000-000000000008', 'Veg Manchurian Noodles', 99.00, true, true),
  ('c1010000-0000-0000-0000-000000000008', 'Veg Dragon Noodles', 99.00, true, true),
  ('c1010000-0000-0000-0000-000000000008', 'Paneer Noodles', 99.00, true, true);

-- Category 9: RICE BOWL (₹99)
INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
  ('c1010000-0000-0000-0000-000000000009', 'Veg Fried Rice', 99.00, true, true),
  ('c1010000-0000-0000-0000-000000000009', 'Veg Schezwan Fried Rice', 99.00, true, true),
  ('c1010000-0000-0000-0000-000000000009', 'Veg Schez. Triple Fried Rice', 99.00, true, true),
  ('c1010000-0000-0000-0000-000000000009', 'Veg Manchurian Fried Rice', 99.00, true, true),
  ('c1010000-0000-0000-0000-000000000009', 'Veg Chilly Fried Rice', 99.00, true, true),
  ('c1010000-0000-0000-0000-000000000009', 'Veg Singapore Fried Rice', 99.00, true, true),
  ('c1010000-0000-0000-0000-000000000009', 'Veg Garlic Chilly Fried Rice', 99.00, true, true),
  ('c1010000-0000-0000-0000-000000000009', 'Mushroom Fried Rice', 99.00, true, true);

-- Category 10: PANEER RICE (₹129)
INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
  ('c1010000-0000-0000-0000-000000000010', 'Veg Paneer Fried Rice', 129.00, true, true);

-- Category 11: VEG PULAO (₹129 / ₹139)
INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
  ('c1010000-0000-0000-0000-000000000011', 'Matar Pulao', 129.00, true, true),
  ('c1010000-0000-0000-0000-000000000011', 'Paneer Pulao', 139.00, true, true);

-- Category 12: COMBO (₹99)
INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
  ('c1010000-0000-0000-0000-000000000012', 'Manchurian + Noodles', 99.00, true, true),
  ('c1010000-0000-0000-0000-000000000012', 'Noodles + Crispy Veg', 99.00, true, true);

-- Category 13: 3 COURSE MEAL (₹149)
INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available) VALUES
  ('c1010000-0000-0000-0000-000000000013', 'French Fries + Fried Rice + Veg Crispy', 149.00, true, true),
  ('c1010000-0000-0000-0000-000000000013', 'French Fries + Veg Noodles + Fried Rice', 149.00, true, true);

COMMIT;
