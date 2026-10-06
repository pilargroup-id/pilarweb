-- Pilarweb migration 009: transaction API support and configurable module access
-- Target: MariaDB 10.11+
-- Rule: no foreign-key constraints.

USE pilarweb;

-- Workflow is intentionally resolved and snapshotted when a DRAFT request is submitted.
ALTER TABLE requests
  MODIFY COLUMN workflow_definition_id BIGINT UNSIGNED NULL,
  MODIFY COLUMN workflow_code VARCHAR(80) NULL,
  MODIFY COLUMN workflow_name VARCHAR(150) NULL,
  MODIFY COLUMN workflow_version INT NULL;

-- Snapshot the approval requirement at submit time so later rule changes do not mutate pending history.
ALTER TABLE request_approvals
  ADD COLUMN IF NOT EXISTS department_id INT DEFAULT NULL AFTER approval_order,
  ADD COLUMN IF NOT EXISTS department_name VARCHAR(255) DEFAULT NULL AFTER department_id,
  ADD COLUMN IF NOT EXISTS required_job_level_value INT DEFAULT NULL AFTER department_name,
  ADD COLUMN IF NOT EXISTS required_job_level_name VARCHAR(150) DEFAULT NULL AFTER required_job_level_value,
  ADD COLUMN IF NOT EXISTS allow_higher_job_level TINYINT(1) NOT NULL DEFAULT 1 AFTER required_job_level_name;

ALTER TABLE request_approvals
  ADD INDEX IF NOT EXISTS idx_request_approvals_department_status (department_id, status);

-- A fulfillment has one handover record. Multiple fulfillments remain supported per request.
ALTER TABLE warehouse_handovers
  ADD UNIQUE INDEX IF NOT EXISTS uq_warehouse_handovers_fulfillment (fulfillment_id);

-- Finance closing needs to distinguish issued and returned quantities in the selected period.
ALTER TABLE inventory_adjustment_batch_items
  ADD COLUMN IF NOT EXISTS returned_qty DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER actual_issued_qty;

-- Configurable operational access. No user/department values are guessed or hardcoded here.
CREATE TABLE IF NOT EXISTS module_access_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  module_code VARCHAR(80) NOT NULL,
  user_id VARCHAR(36) DEFAULT NULL,
  department_id INT DEFAULT NULL,
  company_id VARCHAR(100) DEFAULT NULL,
  min_job_level_value DECIMAL(10,2) DEFAULT NULL,
  max_job_level_value DECIMAL(10,2) DEFAULT NULL,
  priority INT NOT NULL DEFAULT 100,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id VARCHAR(36) DEFAULT NULL,
  created_by_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_module_access_rules_lookup (module_code, is_active, priority),
  KEY idx_module_access_rules_user (user_id, is_active),
  KEY idx_module_access_rules_department (department_id, is_active)
) ENGINE=InnoDB;

-- Closing batches can aggregate multiple source warehouses / IT references for one request item.
ALTER TABLE inventory_adjustment_batch_items
  MODIFY COLUMN source_warehouse_code VARCHAR(500) DEFAULT NULL,
  MODIFY COLUMN inventory_transfer_number VARCHAR(500) DEFAULT NULL;

-- Warehouse explicitly records how much of a returned line is physically back in stock.
-- This avoids deriving financial behavior from GOOD/DAMAGED/MISSING labels.
ALTER TABLE return_items
  ADD COLUMN IF NOT EXISTS stock_returned_qty DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER returned_qty;
