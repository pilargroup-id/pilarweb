USE pilarweb;

INSERT INTO financial_closing_settings
  (closing_day, timezone, is_active)
SELECT 7, 'Asia/Jakarta', 1
WHERE NOT EXISTS (
  SELECT 1
  FROM financial_closing_settings
  WHERE is_active = 1
);

-- The closing day is configuration, not hardcoded application logic.
