-- Pilarweb consolidated schema
-- Generated from clean development migrations 001-008.


-- ================================================================
-- 001_master_configuration.sql
-- ================================================================
-- Pilarweb migration 001: master configuration
-- Clean development baseline. MariaDB 10.11+.

CREATE DATABASE IF NOT EXISTS pilarweb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE pilarweb;

CREATE TABLE IF NOT EXISTS master_request_purposes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  return_type ENUM('NON_RETURNABLE','RETURNABLE') NOT NULL DEFAULT 'NON_RETURNABLE',
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_master_request_purposes_code (code),
  KEY idx_master_request_purposes_active_sort (is_active, sort_order),
  KEY idx_master_request_purposes_return_type (return_type, is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS warehouse_locations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  internal_id BIGINT UNSIGNED DEFAULT NULL COMMENT 'Optional NetSuite Location Internal ID',
  code VARCHAR(80) NOT NULL,
  name VARCHAR(150) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_warehouse_locations_code (code),
  UNIQUE KEY uq_warehouse_locations_internal_id (internal_id),
  KEY idx_warehouse_locations_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS financial_closing_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  closing_day TINYINT UNSIGNED NOT NULL DEFAULT 7,
  timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Jakarta',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id VARCHAR(36) DEFAULT NULL,
  created_by_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_financial_closing_settings_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS number_sequences (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sequence_key VARCHAR(80) NOT NULL,
  period_key VARCHAR(20) NOT NULL,
  last_number BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_number_sequences_key_period (sequence_key, period_key)
) ENGINE=InnoDB;

-- ================================================================
-- 002_access_approval_configuration.sql
-- ================================================================
-- Pilarweb migration 002: operational access, approval rules, validation-override access
USE pilarweb;

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

CREATE TABLE IF NOT EXISTS approval_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  department_id INT DEFAULT NULL,
  department_name VARCHAR(255) DEFAULT NULL,
  requester_block_min_job_level_value INT DEFAULT NULL,
  approver_min_job_level_value INT NOT NULL,
  approver_job_level_name VARCHAR(150) DEFAULT NULL,
  allow_higher_job_level TINYINT(1) NOT NULL DEFAULT 1,
  priority INT NOT NULL DEFAULT 100,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_approval_rules_code (code),
  KEY idx_approval_rules_department (department_id, is_active, priority)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS validation_override_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL,
  user_name_snapshot VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id VARCHAR(36) DEFAULT NULL,
  created_by_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_validation_override_users_user (user_id),
  KEY idx_validation_override_users_active (is_active)
) ENGINE=InnoDB;

-- ================================================================
-- 003_requests.sql
-- ================================================================
-- Pilarweb migration 003: request header + SKU snapshots
USE pilarweb;

CREATE TABLE IF NOT EXISTS requests (
  id VARCHAR(36) NOT NULL,
  request_number VARCHAR(80) NOT NULL,
  request_purpose_id BIGINT UNSIGNED NOT NULL,
  request_purpose_code VARCHAR(50) NOT NULL,
  request_purpose_name VARCHAR(150) NOT NULL,
  purpose_return_type ENUM('NON_RETURNABLE','RETURNABLE') NOT NULL,
  status VARCHAR(80) NOT NULL DEFAULT 'PENDING_DEPARTMENT_APPROVAL',
  requester_user_id VARCHAR(36) NOT NULL,
  requester_internal_id INT DEFAULT NULL,
  requester_name VARCHAR(255) DEFAULT NULL,
  requester_job_level_value INT DEFAULT NULL,
  requester_job_level_name VARCHAR(150) DEFAULT NULL,
  department_id INT NOT NULL COMMENT 'Requester department snapshot; drives approval and request restriction',
  department_name VARCHAR(255) DEFAULT NULL,
  target_department_id INT NOT NULL COMMENT 'Historical/business target department; does not drive approval or restriction',
  target_department_name VARCHAR(255) DEFAULT NULL,
  company_id VARCHAR(100) DEFAULT NULL,
  company_name VARCHAR(255) DEFAULT NULL,
  reason TEXT NOT NULL,
  return_due_date DATE DEFAULT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME DEFAULT NULL,
  canceled_at DATETIME DEFAULT NULL,
  reverted_at DATETIME DEFAULT NULL,
  reverted_by_user_id VARCHAR(36) DEFAULT NULL,
  reverted_by_name VARCHAR(255) DEFAULT NULL,
  revert_reason TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_requests_number (request_number),
  KEY idx_requests_requester (requester_user_id, created_at),
  KEY idx_requests_department_status (department_id, status),
  KEY idx_requests_target_department (target_department_id, created_at),
  KEY idx_requests_purpose (request_purpose_id),
  KEY idx_requests_return_type_due (purpose_return_type, return_due_date),
  KEY idx_requests_status_created (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS request_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  itembase_item_id VARCHAR(36) NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  selling_name VARCHAR(255) DEFAULT NULL,
  parent_id VARCHAR(100) DEFAULT NULL,
  parent_name VARCHAR(255) DEFAULT NULL,
  variant_name VARCHAR(255) DEFAULT NULL,
  uom_code VARCHAR(80) DEFAULT NULL,
  item_kind VARCHAR(50) NOT NULL DEFAULT 'regular',
  requested_qty DECIMAL(18,4) NOT NULL,
  notes VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_request_items_item (request_id, itembase_item_id),
  KEY idx_request_items_request (request_id),
  KEY idx_request_items_item_code (item_code),
  KEY idx_request_items_itembase_id (itembase_item_id)
) ENGINE=InnoDB;

-- ================================================================
-- 004_approvals_finance.sql
-- ================================================================
-- Pilarweb migration 004: manager approval + Finance per-SKU/per-quantity review
USE pilarweb;

CREATE TABLE IF NOT EXISTS request_approvals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  approval_rule_id BIGINT UNSIGNED DEFAULT NULL,
  approval_order INT NOT NULL DEFAULT 1,
  department_id INT NOT NULL,
  department_name VARCHAR(255) DEFAULT NULL,
  required_job_level_value INT NOT NULL,
  required_job_level_name VARCHAR(150) DEFAULT NULL,
  allow_higher_job_level TINYINT(1) NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  approver_user_id VARCHAR(36) DEFAULT NULL,
  approver_internal_id INT DEFAULT NULL,
  approver_name VARCHAR(255) DEFAULT NULL,
  approver_job_level_value INT DEFAULT NULL,
  approver_job_level_name VARCHAR(150) DEFAULT NULL,
  note TEXT DEFAULT NULL,
  decided_at DATETIME DEFAULT NULL,
  reverted_at DATETIME DEFAULT NULL,
  reverted_by_user_id VARCHAR(36) DEFAULT NULL,
  reverted_by_name VARCHAR(255) DEFAULT NULL,
  revert_reason TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_request_approvals_request_order (request_id, approval_order),
  KEY idx_request_approvals_status (status),
  KEY idx_request_approvals_department_status (department_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS finance_reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  reviewer_user_id VARCHAR(36) DEFAULT NULL,
  reviewer_internal_id INT DEFAULT NULL,
  reviewer_name VARCHAR(255) DEFAULT NULL,
  note TEXT DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_finance_reviews_request (request_id),
  KEY idx_finance_reviews_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS finance_review_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  finance_review_id BIGINT UNSIGNED NOT NULL,
  request_item_id BIGINT UNSIGNED NOT NULL,
  requested_qty_snapshot DECIMAL(18,4) NOT NULL,
  decision VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  approved_qty DECIMAL(18,4) NOT NULL DEFAULT 0,
  rejected_qty DECIMAL(18,4) NOT NULL DEFAULT 0,
  note VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_finance_review_items_request_item (finance_review_id, request_item_id),
  KEY idx_finance_review_items_review (finance_review_id),
  KEY idx_finance_review_items_request_item (request_item_id),
  KEY idx_finance_review_items_decision (decision)
) ENGINE=InnoDB;

-- ================================================================
-- 005_warehouse_fulfillment.sql
-- ================================================================
-- Pilarweb migration 005: one fulfillment header owns source warehouse + IWT
USE pilarweb;

CREATE TABLE IF NOT EXISTS warehouse_fulfillments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  fulfillment_number VARCHAR(80) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PICKING',
  source_warehouse_id BIGINT UNSIGNED DEFAULT NULL,
  source_warehouse_internal_id BIGINT UNSIGNED DEFAULT NULL,
  source_warehouse_code VARCHAR(80) DEFAULT NULL,
  source_warehouse_name VARCHAR(150) DEFAULT NULL,
  inventory_transfer_number VARCHAR(100) DEFAULT NULL,
  inventory_transfer_recorded_at DATETIME DEFAULT NULL,
  created_by_user_id VARCHAR(36) DEFAULT NULL,
  created_by_name VARCHAR(255) DEFAULT NULL,
  picking_print_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_picking_printed_by_user_id VARCHAR(36) DEFAULT NULL,
  last_picking_printed_by_name VARCHAR(255) DEFAULT NULL,
  last_picking_printed_at DATETIME DEFAULT NULL,
  progress_saved_by_user_id VARCHAR(36) DEFAULT NULL,
  progress_saved_by_name VARCHAR(255) DEFAULT NULL,
  progress_saved_at DATETIME DEFAULT NULL,
  picking_completed_by_user_id VARCHAR(36) DEFAULT NULL,
  picking_completed_by_name VARCHAR(255) DEFAULT NULL,
  picking_completed_at DATETIME DEFAULT NULL,
  do_print_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_do_printed_by_user_id VARCHAR(36) DEFAULT NULL,
  last_do_printed_by_name VARCHAR(255) DEFAULT NULL,
  last_do_printed_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_warehouse_fulfillments_request (request_id),
  UNIQUE KEY uq_warehouse_fulfillments_number (fulfillment_number),
  KEY idx_warehouse_fulfillments_status (status, updated_at),
  KEY idx_warehouse_fulfillments_source (source_warehouse_id),
  KEY idx_warehouse_fulfillments_iwt (inventory_transfer_number)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS warehouse_fulfillment_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fulfillment_id BIGINT UNSIGNED NOT NULL,
  request_item_id BIGINT UNSIGNED NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  requested_qty_snapshot DECIMAL(18,4) NOT NULL,
  finance_approved_qty_snapshot DECIMAL(18,4) NOT NULL,
  finance_rejected_qty_snapshot DECIMAL(18,4) NOT NULL DEFAULT 0,
  actual_qty DECIMAL(18,4) DEFAULT NULL,
  note VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_warehouse_fulfillment_items_request_item (fulfillment_id, request_item_id),
  KEY idx_warehouse_fulfillment_items_fulfillment (fulfillment_id),
  KEY idx_warehouse_fulfillment_items_request_item (request_item_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS warehouse_handovers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  fulfillment_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'HANDED_OVER',
  handed_over_by_user_id VARCHAR(36) DEFAULT NULL,
  handed_over_by_name VARCHAR(255) DEFAULT NULL,
  handed_over_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_warehouse_handovers_fulfillment (fulfillment_id),
  KEY idx_warehouse_handovers_request (request_id),
  KEY idx_warehouse_handovers_status (status, handed_over_at)
) ENGINE=InnoDB;

-- ================================================================
-- 006_returns_validation_override.sql
-- ================================================================
-- Pilarweb migration 006: strict return obligation + department restriction override
USE pilarweb;

CREATE TABLE IF NOT EXISTS returns (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  return_number VARCHAR(80) NOT NULL,
  request_id VARCHAR(36) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REQUESTER',
  due_date DATE NOT NULL,
  requester_submitted_by_user_id VARCHAR(36) DEFAULT NULL,
  requester_submitted_by_name VARCHAR(255) DEFAULT NULL,
  requester_submitted_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_returns_number (return_number),
  UNIQUE KEY uq_returns_request (request_id),
  KEY idx_returns_status_due (status, due_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS return_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  return_id BIGINT UNSIGNED NOT NULL,
  request_item_id BIGINT UNSIGNED NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  expected_qty DECIMAL(18,4) NOT NULL,
  requester_return_qty DECIMAL(18,4) DEFAULT NULL,
  warehouse_received_qty DECIMAL(18,4) NOT NULL DEFAULT 0,
  note VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_return_items_request_item (return_id, request_item_id),
  KEY idx_return_items_return (return_id),
  KEY idx_return_items_request_item (request_item_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS return_receipts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  receipt_number VARCHAR(80) NOT NULL,
  return_id BIGINT UNSIGNED NOT NULL,
  received_by_user_id VARCHAR(36) NOT NULL,
  received_by_name VARCHAR(255) DEFAULT NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_return_receipts_number (receipt_number),
  KEY idx_return_receipts_return (return_id, received_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS return_receipt_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  return_receipt_id BIGINT UNSIGNED NOT NULL,
  return_item_id BIGINT UNSIGNED NOT NULL,
  received_qty DECIMAL(18,4) NOT NULL,
  note VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_return_receipt_items_receipt (return_receipt_id),
  KEY idx_return_receipt_items_return_item (return_item_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS validation_overrides (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  validation_code VARCHAR(80) NOT NULL,
  scope_type VARCHAR(50) NOT NULL DEFAULT 'DEPARTMENT',
  department_id INT NOT NULL,
  department_name VARCHAR(255) DEFAULT NULL,
  request_id VARCHAR(36) DEFAULT NULL,
  reason TEXT NOT NULL,
  valid_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_until DATETIME DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id VARCHAR(36) NOT NULL,
  created_by_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_by_user_id VARCHAR(36) DEFAULT NULL,
  revoked_by_name VARCHAR(255) DEFAULT NULL,
  revoked_at DATETIME DEFAULT NULL,
  revoke_reason TEXT DEFAULT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_validation_overrides_department (department_id, is_active, valid_from, valid_until),
  KEY idx_validation_overrides_request (request_id, is_active),
  KEY idx_validation_overrides_code (validation_code, is_active)
) ENGINE=InnoDB;

-- ================================================================
-- 007_financial_closing.sql
-- ================================================================
-- Pilarweb migration 007: Finance periods + signed issue/return movements
USE pilarweb;

CREATE TABLE IF NOT EXISTS financial_periods (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  period_key VARCHAR(20) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  closing_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  closing_started_at DATETIME DEFAULT NULL,
  closed_at DATETIME DEFAULT NULL,
  closed_by_user_id VARCHAR(36) DEFAULT NULL,
  closed_by_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_financial_periods_key (period_key),
  KEY idx_financial_periods_status (status, closing_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_adjustment_batches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  financial_period_id BIGINT UNSIGNED NOT NULL,
  batch_number VARCHAR(80) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  netsuite_reference VARCHAR(100) DEFAULT NULL,
  generated_by_user_id VARCHAR(36) DEFAULT NULL,
  generated_by_name VARCHAR(255) DEFAULT NULL,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  posted_at DATETIME DEFAULT NULL,
  note TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_adjustment_batches_number (batch_number),
  KEY idx_inventory_adjustment_batches_period (financial_period_id),
  KEY idx_inventory_adjustment_batches_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_adjustment_batch_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  movement_type ENUM('ISSUE','RETURN') NOT NULL,
  movement_at DATETIME NOT NULL,
  request_id VARCHAR(36) NOT NULL,
  request_number VARCHAR(80) NOT NULL,
  request_item_id BIGINT UNSIGNED NOT NULL,
  return_receipt_item_id BIGINT UNSIGNED DEFAULT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  movement_qty DECIMAL(18,4) NOT NULL,
  source_warehouse_internal_id BIGINT UNSIGNED DEFAULT NULL,
  source_warehouse_code VARCHAR(80) DEFAULT NULL,
  destination_warehouse_code VARCHAR(80) DEFAULT NULL,
  inventory_transfer_number VARCHAR(100) DEFAULT NULL,
  adjustment_qty DECIMAL(18,4) NOT NULL COMMENT 'ISSUE positive, RETURN negative',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_adjustment_batch_items_batch (batch_id),
  KEY idx_adjustment_batch_items_request (request_id),
  KEY idx_adjustment_batch_items_item_code (item_code),
  KEY idx_adjustment_batch_items_movement (movement_type, movement_at)
) ENGINE=InnoDB;

-- ================================================================
-- 008_activity_audit.sql
-- ================================================================
-- Pilarweb migration 008: comments + append-only activity log
USE pilarweb;

CREATE TABLE IF NOT EXISTS request_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  comment_text TEXT NOT NULL,
  created_by_user_id VARCHAR(36) NOT NULL,
  created_by_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_request_comments_request (request_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) DEFAULT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(100) DEFAULT NULL,
  action_code VARCHAR(100) NOT NULL,
  actor_user_id VARCHAR(36) DEFAULT NULL,
  actor_name VARCHAR(255) DEFAULT NULL,
  before_json LONGTEXT DEFAULT NULL,
  after_json LONGTEXT DEFAULT NULL,
  metadata_json LONGTEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_activity_logs_request (request_id, created_at),
  KEY idx_activity_logs_entity (entity_type, entity_id),
  KEY idx_activity_logs_action (action_code, created_at)
) ENGINE=InnoDB;
