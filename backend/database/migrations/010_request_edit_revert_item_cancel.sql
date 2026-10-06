-- Pilarweb migration 010: editable approval flow, manager revert, and per-item cancellation
-- Target: MariaDB 10.11+
-- Rule: no foreign-key constraints.

USE pilarweb;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS reverted_at DATETIME DEFAULT NULL AFTER canceled_at,
  ADD COLUMN IF NOT EXISTS reverted_by_user_id VARCHAR(36) DEFAULT NULL AFTER reverted_at,
  ADD COLUMN IF NOT EXISTS reverted_by_name VARCHAR(255) DEFAULT NULL AFTER reverted_by_user_id,
  ADD COLUMN IF NOT EXISTS revert_reason TEXT DEFAULT NULL AFTER reverted_by_name;

ALTER TABLE request_items
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' AFTER requested_qty,
  ADD COLUMN IF NOT EXISTS canceled_at DATETIME DEFAULT NULL AFTER notes,
  ADD COLUMN IF NOT EXISTS canceled_by_user_id VARCHAR(36) DEFAULT NULL AFTER canceled_at,
  ADD COLUMN IF NOT EXISTS canceled_by_name VARCHAR(255) DEFAULT NULL AFTER canceled_by_user_id,
  ADD COLUMN IF NOT EXISTS canceled_by_stage VARCHAR(80) DEFAULT NULL AFTER canceled_by_name,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT NULL AFTER canceled_by_stage;

ALTER TABLE request_items
  ADD INDEX IF NOT EXISTS idx_request_items_request_status (request_id, status);

ALTER TABLE request_approvals
  ADD COLUMN IF NOT EXISTS reverted_at DATETIME DEFAULT NULL AFTER decided_at,
  ADD COLUMN IF NOT EXISTS reverted_by_user_id VARCHAR(36) DEFAULT NULL AFTER reverted_at,
  ADD COLUMN IF NOT EXISTS reverted_by_name VARCHAR(255) DEFAULT NULL AFTER reverted_by_user_id,
  ADD COLUMN IF NOT EXISTS revert_reason TEXT DEFAULT NULL AFTER reverted_by_name;

-- Rename the initial request purposes while preserving their IDs and existing workflow assignments.
-- Guarded with NOT EXISTS so a rerun is a no-op once the target code already exists
-- (e.g. it was already renamed, or a later seed run inserted the new code as a separate row).
UPDATE master_request_purposes
SET code = 'TIKTOK_AFFILIATE',
    name = 'TikTok Affiliate',
    description = 'Goods requested for TikTok affiliate activities.',
    sort_order = 10
WHERE code = 'TIKTOK_SHIPMENT'
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT 1 FROM master_request_purposes WHERE code = 'TIKTOK_AFFILIATE') AS existing
  );

UPDATE master_request_purposes
SET code = 'YOUTUBE_AFFILIATE',
    name = 'YouTube Affiliate',
    description = 'Goods requested for YouTube affiliate activities.',
    sort_order = 20
WHERE code = 'YOUTUBE_SHIPMENT'
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT 1 FROM master_request_purposes WHERE code = 'YOUTUBE_AFFILIATE') AS existing
  );

UPDATE master_request_purposes
SET code = 'EXTERNAL_DELIVERY',
    name = 'External Delivery',
    description = 'Goods sent or handed over to an external party.',
    sort_order = 30
WHERE code = 'MARKETING_REQUEST'
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT 1 FROM master_request_purposes WHERE code = 'EXTERNAL_DELIVERY') AS existing
  );

UPDATE master_request_purposes
SET name = 'Internal Use',
    description = 'Goods requested for internal company use.',
    sort_order = 40
WHERE code = 'INTERNAL_USE';

UPDATE master_request_purposes
SET code = 'LOAN',
    name = 'Loan',
    description = 'Goods borrowed temporarily and expected to be returned.',
    sort_order = 50
WHERE code = 'PRODUCT_SAMPLE'
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT 1 FROM master_request_purposes WHERE code = 'LOAN') AS existing
  );
