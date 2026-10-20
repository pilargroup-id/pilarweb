USE pilarweb;

-- Defensive guard: database/migrations/001_master_configuration.sql creates this table with
-- `CREATE TABLE IF NOT EXISTS`, so a database that already had master_request_purposes before
-- return_type was added to that migration never received the column, which makes the INSERT
-- below fail with "Unknown column 'return_type'". Add it here if it is still missing.
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'master_request_purposes' AND COLUMN_NAME = 'return_type'
);
SET @ddl = IF(@col_exists = 0,
  'ALTER TABLE master_request_purposes ADD COLUMN return_type ENUM(''NON_RETURNABLE'',''RETURNABLE'') NOT NULL DEFAULT ''NON_RETURNABLE'' AFTER description',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Default baseline. Admin can change return_type later without affecting historical request snapshots.
INSERT INTO master_request_purposes
  (code, name, description, return_type, sort_order, is_active)
VALUES
  ('TIKTOK_AFFILIATE', 'TikTok Affiliate', 'Goods requested for TikTok affiliate activities.', 'NON_RETURNABLE', 10, 1),
  ('YOUTUBE_AFFILIATE', 'YouTube Affiliate', 'Goods requested for YouTube affiliate activities.', 'NON_RETURNABLE', 20, 1),
  ('EXTERNAL_DELIVERY', 'External Delivery', 'Goods sent or handed over to an external party.', 'NON_RETURNABLE', 30, 1),
  ('INTERNAL_USE', 'Internal Use', 'Goods requested for internal company use.', 'NON_RETURNABLE', 40, 1),
  ('LOAN', 'Loan', 'Goods that must be returned by the requester department.', 'RETURNABLE', 50, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  return_type = VALUES(return_type),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);
