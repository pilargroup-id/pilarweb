-- Pilarweb migration 011: Finance rejected qty and Warehouse shortage enum support
-- Target: MySQL 8.0+ / MariaDB 10.11+
-- GET /api/warehouse/handovers is a source-code endpoint and requires no additional handover table change.

USE pilarweb;

-- -----------------------------------------------------------------------------
-- Finance review quantity audit
-- -----------------------------------------------------------------------------
-- ADD COLUMN IF NOT EXISTS is MariaDB-only syntax; MySQL 8 rejects it outright,
-- so each column is guarded with an information_schema check instead.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_review_items'
    AND COLUMN_NAME = 'requested_qty_snapshot'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE finance_review_items ADD COLUMN requested_qty_snapshot DECIMAL(18,4) DEFAULT NULL AFTER request_item_id',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_review_items'
    AND COLUMN_NAME = 'rejected_qty'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE finance_review_items ADD COLUMN rejected_qty DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER approved_qty',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill the historical requested quantity snapshot from the request item.
UPDATE finance_review_items fri
INNER JOIN request_items ri ON ri.id = fri.request_item_id
SET fri.requested_qty_snapshot = ri.requested_qty
WHERE fri.requested_qty_snapshot IS NULL;

-- Backfill rejected quantity using the existing Finance decision.
-- APPROVED may be partial: rejected = requested - approved.
-- REJECTED means the full requested qty was rejected.
-- CANCELED remains a separate business concept and therefore rejected_qty = 0.
UPDATE finance_review_items
SET rejected_qty = CASE
  WHEN decision = 'APPROVED' THEN GREATEST(
    COALESCE(requested_qty_snapshot, 0) - COALESCE(approved_qty, 0),
    0
  )
  WHEN decision = 'REJECTED' THEN COALESCE(requested_qty_snapshot, 0)
  ELSE 0
END;

-- -----------------------------------------------------------------------------
-- Warehouse shortage reason cleanup
-- -----------------------------------------------------------------------------
-- OUT_OF_STOCK and INSUFFICIENT_STOCK are intentionally merged because both
-- describe the same operational cause: stock is insufficient for fulfillment.
UPDATE warehouse_fulfillment_items
SET shortage_reason_code = 'STOCK_SHORTAGE'
WHERE shortage_reason_code IN ('OUT_OF_STOCK', 'INSUFFICIENT_STOCK');

-- Any unknown historical value is preserved as OTHER before converting VARCHAR
-- to ENUM, preventing migration failure due to an unsupported legacy value.
UPDATE warehouse_fulfillment_items
SET shortage_reason_code = 'OTHER'
WHERE shortage_reason_code IS NOT NULL
  AND shortage_reason_code NOT IN ('STOCK_SHORTAGE', 'DAMAGED', 'NOT_FOUND', 'OTHER');

ALTER TABLE warehouse_fulfillment_items
  MODIFY COLUMN shortage_reason_code ENUM(
    'STOCK_SHORTAGE',
    'DAMAGED',
    'NOT_FOUND',
    'OTHER'
  ) DEFAULT NULL;
