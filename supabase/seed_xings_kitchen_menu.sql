-- ============================================
-- THE XINGS KITCHEN MENU FOR WEBRAJYA POS
-- ============================================

BEGIN;

-- 1. MENU CATEGORIES
INSERT INTO public.menu_categories (name, display_order, is_active)
VALUES
  ('Crispy Starter', 1, true),
  ('Soup', 2, true),
  ('Starter', 3, true),
  ('Rolls', 4, true),
  ('Veg Rice', 5, true),
  ('Veg Noodles', 6, true),
  ('Combo', 7, true);


-- ============================================
-- 2. CRISPY STARTER (Price: ₹49)
-- ============================================

INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available)
SELECT
  c.id,
  v.name,
  49.00,
  true,
  true
FROM public.menu_categories c
CROSS JOIN (
  VALUES
    ('Crispy Veg'),
    ('Crispy Corn'),
    ('Thread Paneer'),
    ('Paneer Kumkum'),
    ('Paneer Majestic')
) AS v(name)
WHERE c.name = 'Crispy Starter';


-- ============================================
-- 3. SOUP (Price: ₹49)
-- ============================================

INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available)
SELECT
  c.id,
  v.name,
  49.00,
  true,
  true
FROM public.menu_categories c
CROSS JOIN (
  VALUES
    ('Veg Manchow Soup'),
    ('Veg Hot & Sour Soup'),
    ('Veg Sweet Corn Soup'),
    ('Lemon Coriander Soup'),
    ('Onion Garlic Soup'),
    ('Tomato Soup'),
    ('Tom Yum Soup')
) AS v(name)
WHERE c.name = 'Soup';


-- ============================================
-- 4. STARTER (Price: ₹99)
-- ============================================

INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available)
SELECT
  c.id,
  v.name,
  99.00,
  true,
  true
FROM public.menu_categories c
CROSS JOIN (
  VALUES
    ('Paneer Chilly'),
    ('Dragon Paneer'),
    ('Paneer Manchurian'),
    ('Lemon Paneer'),
    ('Paneer Stick'),
    ('Garlic Paneer'),
    ('Paneer Black Pepper'),
    ('Veg Lollipop'),
    ('Veg Manchurian'),
    ('Paneer 65'),
    ('Veg 99')
) AS v(name)
WHERE c.name = 'Starter';


-- ============================================
-- 5. ROLLS (Price: ₹99)
-- ============================================

INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available)
SELECT
  c.id,
  v.name,
  99.00,
  true,
  true
FROM public.menu_categories c
CROSS JOIN (
  VALUES
    ('Paneer Spring Roll'),
    ('Spring Roll')
) AS v(name)
WHERE c.name = 'Rolls';


-- ============================================
-- 6. VEG RICE (Price: ₹99)
-- ============================================

INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available)
SELECT
  c.id,
  v.name,
  99.00,
  true,
  true
FROM public.menu_categories c
CROSS JOIN (
  VALUES
    ('Veg Fried Rice'),
    ('Veg Schezwan Fried Rice'),
    ('Veg Schez. Triple Fried Rice'),
    ('Veg Manchurian Fried Rice'),
    ('Veg Chilly Fried Rice'),
    ('Veg Singapore Fried Rice'),
    ('Veg Dragon Fried Rice'),
    ('Veg Paneer Fried Rice'),
    ('Veg Garlic Chilly Fried Rice')
) AS v(name)
WHERE c.name = 'Veg Rice';


-- ============================================
-- 7. VEG NOODLES (Price: ₹99)
-- ============================================

INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available)
SELECT
  c.id,
  v.name,
  99.00,
  true,
  true
FROM public.menu_categories c
CROSS JOIN (
  VALUES
    ('Veg Hakka Noodles'),
    ('Veg Schezwan Noodles'),
    ('Veg Schez. Triple Noodles'),
    ('Veg Chilly Noodles'),
    ('Veg Manchurian Noodles'),
    ('Veg Dragon Noodles'),
    ('Paneer Noodles')
) AS v(name)
WHERE c.name = 'Veg Noodles';


-- ============================================
-- 8. COMBO (Price: ₹99)
-- ============================================

INSERT INTO public.menu_items (category_id, name, price, is_veg, is_available)
SELECT
  c.id,
  v.name,
  99.00,
  true,
  true
FROM public.menu_categories c
CROSS JOIN (
  VALUES
    ('Fried Rice + Manchurian + Noodles'),
    ('Noodles + Paneer Chilly')
) AS v(name)
WHERE c.name = 'Combo';

COMMIT;
