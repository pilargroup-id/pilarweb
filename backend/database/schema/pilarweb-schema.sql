-- Pilarweb 001: master configuration
CREATE DATABASE IF NOT EXISTS pilarweb CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE pilarweb;

CREATE TABLE master_request_purposes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  return_type ENUM('NON_RETURNABLE','RETURNABLE') NOT NULL DEFAULT 'NON_RETURNABLE',
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_master_request_purposes_code (code),
  KEY idx_master_request_purposes_active_sort (is_active, sort_order)
) ENGINE=InnoDB;

CREATE TABLE warehouse_locations (
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

CREATE TABLE request_policy_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  receipt_confirmation_days INT UNSIGNED NOT NULL DEFAULT 2,
  discrepancy_resolution_days INT UNSIGNED NOT NULL DEFAULT 2,
  discrepancy_escalation_days INT UNSIGNED NOT NULL DEFAULT 3,
  discrepancy_supervisor_lock_days INT UNSIGNED NOT NULL DEFAULT 5,
  return_due_days INT UNSIGNED NOT NULL DEFAULT 14,
  timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Jakarta',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id VARCHAR(36) DEFAULT NULL,
  created_by_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_request_policy_settings_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE financial_closing_settings (
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

CREATE TABLE number_sequences (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sequence_key VARCHAR(80) NOT NULL,
  period_key VARCHAR(20) NOT NULL,
  last_number BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_number_sequences_key_period (sequence_key, period_key)
) ENGINE=InnoDB;
-- Pilarweb 002: access, approval, validation policy
USE pilarweb;

CREATE TABLE module_access_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  module_code VARCHAR(80) NOT NULL,
  user_id VARCHAR(36) DEFAULT NULL,
  name VARCHAR(255) DEFAULT NULL COMMENT 'Human-readable person name for user-specific access rows',
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

CREATE TABLE approval_rules (
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

CREATE TABLE validation_override_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id VARCHAR(36) DEFAULT NULL,
  created_by_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_validation_override_users_user (user_id),
  KEY idx_validation_override_users_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE validation_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  block_scope ENUM('NONE','USER','DEPARTMENT') NOT NULL DEFAULT 'NONE',
  is_blocking TINYINT(1) NOT NULL DEFAULT 0,
  allow_override TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_validation_rules_code (code),
  KEY idx_validation_rules_active (is_active, is_blocking)
) ENGINE=InnoDB;
-- Pilarweb 003: PB request header + SKU snapshots
USE pilarweb;

CREATE TABLE requests (
  id VARCHAR(36) NOT NULL,
  request_number VARCHAR(32) NOT NULL COMMENT 'PB[yy][mm][xxxxx]',
  request_origin ENUM('NORMAL','RETURN_SHORTFALL') NOT NULL DEFAULT 'NORMAL',
  source_request_id VARCHAR(36) DEFAULT NULL,
  source_return_id BIGINT UNSIGNED DEFAULT NULL,
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
  department_id INT NOT NULL,
  department_name VARCHAR(255) DEFAULT NULL,
  target_department_id INT NOT NULL,
  target_department_name VARCHAR(255) DEFAULT NULL,
  company_id VARCHAR(100) DEFAULT NULL,
  company_name VARCHAR(255) DEFAULT NULL,
  reason TEXT NOT NULL,
  receipt_confirmation_days_snapshot INT UNSIGNED NOT NULL,
  discrepancy_resolution_days_snapshot INT UNSIGNED NOT NULL,
  discrepancy_escalation_days_snapshot INT UNSIGNED NOT NULL,
  discrepancy_supervisor_lock_days_snapshot INT UNSIGNED NOT NULL,
  return_due_days_snapshot INT UNSIGNED NOT NULL,
  policy_timezone_snapshot VARCHAR(100) NOT NULL,
  final_received_at DATETIME DEFAULT NULL,
  return_due_at DATETIME DEFAULT NULL,
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
  KEY idx_requests_origin_source (request_origin, source_request_id, source_return_id),
  KEY idx_requests_requester (requester_user_id, created_at),
  KEY idx_requests_department_status (department_id, status),
  KEY idx_requests_target_department (target_department_id, created_at),
  KEY idx_requests_status_created (status, created_at),
  KEY idx_requests_return_due (purpose_return_type, return_due_at)
) ENGINE=InnoDB;

CREATE TABLE request_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  source_return_item_id BIGINT UNSIGNED DEFAULT NULL,
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
  KEY idx_request_items_source_return (source_return_item_id),
  KEY idx_request_items_item_code (item_code)
) ENGINE=InnoDB;
-- Pilarweb 004: manager approval + Finance per-SKU/per-quantity review
USE pilarweb;

CREATE TABLE request_approvals (
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
  KEY idx_request_approvals_department_status (department_id, status)
) ENGINE=InnoDB;

CREATE TABLE finance_reviews (
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

CREATE TABLE finance_review_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  finance_review_id BIGINT UNSIGNED NOT NULL,
  request_item_id BIGINT UNSIGNED NOT NULL,
  requested_qty_snapshot DECIMAL(18,4) NOT NULL,
  decision ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  approved_qty DECIMAL(18,4) NOT NULL DEFAULT 0,
  rejected_qty DECIMAL(18,4) NOT NULL DEFAULT 0,
  note VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_finance_review_items_request_item (finance_review_id, request_item_id),
  KEY idx_finance_review_items_review (finance_review_id),
  KEY idx_finance_review_items_request_item (request_item_id)
) ENGINE=InnoDB;
-- Pilarweb 005: Warehouse fulfillment, dispatch, requester receipt and discrepancy
USE pilarweb;

CREATE TABLE warehouse_fulfillments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  parent_fulfillment_id BIGINT UNSIGNED DEFAULT NULL,
  fulfillment_number VARCHAR(80) NOT NULL,
  fulfillment_mode ENUM('PHYSICAL','ADMINISTRATIVE') NOT NULL DEFAULT 'PHYSICAL',
  fulfillment_type ENUM('NORMAL','DISCREPANCY_RESEND','RETURN_SHORTFALL_CONVERSION') NOT NULL DEFAULT 'NORMAL',
  status VARCHAR(50) NOT NULL DEFAULT 'PICKING',
  warehouse_department_id INT DEFAULT NULL,
  warehouse_department_name VARCHAR(255) DEFAULT NULL,
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
  dispatched_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_warehouse_fulfillments_number (fulfillment_number),
  KEY idx_warehouse_fulfillments_request (request_id, created_at),
  KEY idx_warehouse_fulfillments_parent (parent_fulfillment_id),
  KEY idx_warehouse_fulfillments_status (status, updated_at)
) ENGINE=InnoDB;

CREATE TABLE warehouse_fulfillment_items (
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

CREATE TABLE delivery_receipts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  fulfillment_id BIGINT UNSIGNED NOT NULL,
  status ENUM('PENDING','PARTIAL','RECEIVED') NOT NULL DEFAULT 'PENDING',
  confirmation_method ENUM('MANUAL','AUTO') DEFAULT NULL,
  confirmation_deadline_at DATETIME NOT NULL,
  confirmed_at DATETIME DEFAULT NULL,
  confirmed_by_user_id VARCHAR(36) DEFAULT NULL,
  confirmed_by_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_delivery_receipts_fulfillment (fulfillment_id),
  KEY idx_delivery_receipts_request (request_id, created_at),
  KEY idx_delivery_receipts_deadline (status, confirmation_deadline_at)
) ENGINE=InnoDB;

CREATE TABLE delivery_receipt_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  delivery_receipt_id BIGINT UNSIGNED NOT NULL,
  fulfillment_item_id BIGINT UNSIGNED NOT NULL,
  request_item_id BIGINT UNSIGNED NOT NULL,
  dispatched_qty DECIMAL(18,4) NOT NULL,
  received_qty DECIMAL(18,4) DEFAULT NULL,
  discrepancy_qty DECIMAL(18,4) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_delivery_receipt_items_fulfillment_item (delivery_receipt_id, fulfillment_item_id),
  KEY idx_delivery_receipt_items_request_item (request_item_id)
) ENGINE=InnoDB;

CREATE TABLE delivery_discrepancies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  fulfillment_id BIGINT UNSIGNED NOT NULL,
  request_item_id BIGINT UNSIGNED NOT NULL,
  delivery_receipt_item_id BIGINT UNSIGNED NOT NULL,
  expected_qty DECIMAL(18,4) NOT NULL,
  received_qty DECIMAL(18,4) NOT NULL,
  difference_qty DECIMAL(18,4) NOT NULL,
  status ENUM('OPEN','OVERDUE','ESCALATED','SUPERVISOR_REQUIRED','RESOLVED') NOT NULL DEFAULT 'OPEN',
  resolution_type ENUM('RESEND','CLOSE_WITH_REASON') DEFAULT NULL,
  resolution_days_snapshot INT UNSIGNED NOT NULL,
  escalation_days_snapshot INT UNSIGNED NOT NULL,
  supervisor_lock_days_snapshot INT UNSIGNED NOT NULL,
  resolution_due_at DATETIME NOT NULL,
  escalation_due_at DATETIME NOT NULL,
  supervisor_lock_at DATETIME NOT NULL,
  resolved_at DATETIME DEFAULT NULL,
  resolved_by_user_id VARCHAR(36) DEFAULT NULL,
  resolved_by_name VARCHAR(255) DEFAULT NULL,
  resolution_note TEXT DEFAULT NULL,
  late_resolution_reason TEXT DEFAULT NULL,
  resend_fulfillment_id BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_delivery_discrepancies_receipt_item (delivery_receipt_item_id),
  KEY idx_delivery_discrepancies_status_due (status, resolution_due_at),
  KEY idx_delivery_discrepancies_request (request_id),
  KEY idx_delivery_discrepancies_warehouse (fulfillment_id)
) ENGINE=InnoDB;

CREATE TABLE warehouse_sla_violations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  violation_type VARCHAR(80) NOT NULL,
  warehouse_department_id INT DEFAULT NULL,
  warehouse_department_name VARCHAR(255) DEFAULT NULL,
  fulfillment_id BIGINT UNSIGNED NOT NULL,
  discrepancy_id BIGINT UNSIGNED NOT NULL,
  due_at DATETIME NOT NULL,
  breached_at DATETIME NOT NULL,
  resolved_at DATETIME DEFAULT NULL,
  overdue_minutes INT UNSIGNED DEFAULT NULL,
  status ENUM('OPEN','RESOLVED') NOT NULL DEFAULT 'OPEN',
  late_reason TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_warehouse_sla_violation_discrepancy (violation_type, discrepancy_id),
  KEY idx_warehouse_sla_violations_department (warehouse_department_id, status),
  KEY idx_warehouse_sla_violations_status (status, breached_at)
) ENGINE=InnoDB;
-- Pilarweb 006: one final return cycle + automatic non-returnable PB shortfall
USE pilarweb;

CREATE TABLE returns (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  return_number VARCHAR(32) NOT NULL COMMENT 'RB[yy][mm][xxxxx]',
  request_id VARCHAR(36) NOT NULL,
  status ENUM('PENDING_REQUESTER','SUBMITTED','COMPLETED') NOT NULL DEFAULT 'PENDING_REQUESTER',
  due_at DATETIME NOT NULL,
  expected_total_qty DECIMAL(18,4) NOT NULL DEFAULT 0,
  requester_declared_total_qty DECIMAL(18,4) DEFAULT NULL,
  warehouse_received_total_qty DECIMAL(18,4) DEFAULT NULL,
  shortfall_total_qty DECIMAL(18,4) DEFAULT NULL,
  requester_submitted_by_user_id VARCHAR(36) DEFAULT NULL,
  requester_submitted_by_name VARCHAR(255) DEFAULT NULL,
  requester_submitted_at DATETIME DEFAULT NULL,
  warehouse_received_by_user_id VARCHAR(36) DEFAULT NULL,
  warehouse_received_by_name VARCHAR(255) DEFAULT NULL,
  warehouse_received_at DATETIME DEFAULT NULL,
  generated_shortfall_request_id VARCHAR(36) DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_returns_number (return_number),
  UNIQUE KEY uq_returns_request (request_id),
  KEY idx_returns_status_due (status, due_at)
) ENGINE=InnoDB;

CREATE TABLE return_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  return_id BIGINT UNSIGNED NOT NULL,
  request_item_id BIGINT UNSIGNED NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  expected_qty DECIMAL(18,4) NOT NULL,
  requester_return_qty DECIMAL(18,4) DEFAULT NULL,
  warehouse_received_qty DECIMAL(18,4) DEFAULT NULL,
  shortfall_qty DECIMAL(18,4) DEFAULT NULL,
  note VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_return_items_request_item (return_id, request_item_id),
  KEY idx_return_items_return (return_id),
  KEY idx_return_items_request_item (request_item_id)
) ENGINE=InnoDB;
-- Pilarweb 007: dynamic requester/user/department restriction + audited override
USE pilarweb;

CREATE TABLE validation_violations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  validation_rule_id BIGINT UNSIGNED NOT NULL,
  validation_code VARCHAR(80) NOT NULL,
  request_id VARCHAR(36) DEFAULT NULL,
  return_id BIGINT UNSIGNED DEFAULT NULL,
  user_id VARCHAR(36) DEFAULT NULL,
  name VARCHAR(255) DEFAULT NULL,
  department_id INT DEFAULT NULL,
  department_name VARCHAR(255) DEFAULT NULL,
  status ENUM('ACTIVE','RESOLVED','OVERRIDDEN') NOT NULL DEFAULT 'ACTIVE',
  detected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME DEFAULT NULL,
  resolution_note TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_validation_violations_active_user (status, user_id, validation_code),
  KEY idx_validation_violations_active_department (status, department_id, validation_code),
  KEY idx_validation_violations_request (request_id, status),
  KEY idx_validation_violations_return (return_id, status)
) ENGINE=InnoDB;

CREATE TABLE validation_overrides (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  violation_id BIGINT UNSIGNED NOT NULL,
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
  KEY idx_validation_overrides_violation (violation_id, is_active, valid_from, valid_until)
) ENGINE=InnoDB;
-- Pilarweb 008: Finance periods + inventory movement batches
USE pilarweb;

CREATE TABLE financial_periods (
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

CREATE TABLE inventory_adjustment_batches (
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

CREATE TABLE inventory_adjustment_batch_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  movement_type ENUM('ISSUE','RETURN') NOT NULL,
  movement_at DATETIME NOT NULL,
  request_id VARCHAR(36) NOT NULL,
  request_number VARCHAR(32) NOT NULL,
  request_item_id BIGINT UNSIGNED NOT NULL,
  return_item_id BIGINT UNSIGNED DEFAULT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  movement_qty DECIMAL(18,4) NOT NULL,
  source_warehouse_internal_id BIGINT UNSIGNED DEFAULT NULL,
  source_warehouse_code VARCHAR(80) DEFAULT NULL,
  destination_warehouse_code VARCHAR(80) DEFAULT NULL,
  inventory_transfer_number VARCHAR(100) DEFAULT NULL,
  adjustment_qty DECIMAL(18,4) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_adjustment_batch_items_batch (batch_id),
  KEY idx_adjustment_batch_items_request (request_id),
  KEY idx_adjustment_batch_items_movement (movement_type, movement_at)
) ENGINE=InnoDB;
-- Pilarweb 009: comments + append-only activity log
USE pilarweb;

CREATE TABLE request_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  comment_text TEXT NOT NULL,
  created_by_user_id VARCHAR(36) NOT NULL,
  created_by_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_request_comments_request (request_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) DEFAULT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) DEFAULT NULL,
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
