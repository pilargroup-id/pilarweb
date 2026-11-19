-- Pilarweb 012: Finance whole-PB reject + Warehouse unable-to-fulfill audit fields
USE pilarweb;

ALTER TABLE warehouse_fulfillments
  ADD COLUMN unable_reason TEXT DEFAULT NULL AFTER dispatched_at,
  ADD COLUMN unable_by_user_id VARCHAR(36) DEFAULT NULL AFTER unable_reason,
  ADD COLUMN unable_by_name VARCHAR(255) DEFAULT NULL AFTER unable_by_user_id,
  ADD COLUMN unable_at DATETIME DEFAULT NULL AFTER unable_by_name;
