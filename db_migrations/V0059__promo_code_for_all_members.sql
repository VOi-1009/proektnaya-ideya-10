UPDATE users
SET promo_code = 'TRK' || LPAD(id::text, 4, '0')
WHERE (promo_code IS NULL OR promo_code = '')
  AND NOT is_bot
  AND NOT is_ai;