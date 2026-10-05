-- Pilarweb migration 001: master configuration
-- Target: MariaDB 10.11+
-- Rule: no foreign-key constraints.

CREATE DATABASE IF NOT EXISTS pilarweb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE pilarweb;

CREATE TABLE IF NOT EXISTS master_request_purposes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_master_request_purposes_code (code),
  KEY idx_master_request_purposes_active_sort (is_active, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS warehouse_locations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(150) NOT NULL,
  is_loan_warehouse TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_warehouse_locations_code (code),
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
-- Pilarweb migration 002: workflow configuration and approval rules

USE pilarweb;

CREATE TABLE IF NOT EXISTS workflow_definitions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(150) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  description VARCHAR(500) DEFAULT NULL,
  requires_return TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_workflow_definitions_code_version (code, version),
  KEY idx_workflow_definitions_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workflow_steps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  workflow_definition_id BIGINT UNSIGNED NOT NULL,
  step_order INT NOT NULL,
  step_code VARCHAR(80) NOT NULL,
  step_name VARCHAR(150) NOT NULL,
  step_type VARCHAR(80) NOT NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  config_json LONGTEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_workflow_steps_order (workflow_definition_id, step_order),
  UNIQUE KEY uq_workflow_steps_code (workflow_definition_id, step_code),
  KEY idx_workflow_steps_definition (workflow_definition_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS request_purpose_workflows (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_purpose_id BIGINT UNSIGNED NOT NULL,
  workflow_definition_id BIGINT UNSIGNED NOT NULL,
  effective_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  effective_to DATETIME DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id VARCHAR(36) DEFAULT NULL,
  created_by_name VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_purpose_workflows_lookup (request_purpose_id, is_active, effective_from, effective_to),
  KEY idx_purpose_workflows_definition (workflow_definition_id)
) ENGINE=InnoDB;

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
  approver_min_job_level_value INT DEFAULT NULL,
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
-- Pilarweb migration 003: request transaction headers and item snapshots

USE pilarweb;

CREATE TABLE IF NOT EXISTS requests (
  id VARCHAR(36) NOT NULL,
  request_number VARCHAR(80) NOT NULL,
  request_purpose_id BIGINT UNSIGNED NOT NULL,
  request_purpose_code VARCHAR(50) NOT NULL,
  request_purpose_name VARCHAR(150) NOT NULL,
  workflow_definition_id BIGINT UNSIGNED DEFAULT NULL,
  workflow_code VARCHAR(80) DEFAULT NULL,
  workflow_name VARCHAR(150) DEFAULT NULL,
  workflow_version INT DEFAULT NULL,
  requires_return TINYINT(1) NOT NULL DEFAULT 0,
  return_due_date DATE DEFAULT NULL,
  status VARCHAR(80) NOT NULL DEFAULT 'DRAFT',
  requester_user_id VARCHAR(36) NOT NULL,
  requester_internal_id INT DEFAULT NULL,
  requester_name VARCHAR(255) DEFAULT NULL,
  requester_job_level_value INT DEFAULT NULL,
  requester_job_level_name VARCHAR(150) DEFAULT NULL,
  department_id INT NOT NULL,
  department_name VARCHAR(255) DEFAULT NULL,
  company_id VARCHAR(100) DEFAULT NULL,
  company_name VARCHAR(255) DEFAULT NULL,
  reason TEXT DEFAULT NULL,
  submitted_at DATETIME DEFAULT NULL,
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
  KEY idx_requests_purpose (request_purpose_id),
  KEY idx_requests_workflow (workflow_definition_id),
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
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  notes VARCHAR(500) DEFAULT NULL,
  canceled_at DATETIME DEFAULT NULL,
  canceled_by_user_id VARCHAR(36) DEFAULT NULL,
  canceled_by_name VARCHAR(255) DEFAULT NULL,
  canceled_by_stage VARCHAR(80) DEFAULT NULL,
  cancel_reason TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_request_items_request (request_id),
  KEY idx_request_items_request_status (request_id, status),
  KEY idx_request_items_item_code (item_code),
  KEY idx_request_items_itembase_id (itembase_item_id)
) ENGINE=InnoDB;
-- Pilarweb migration 004: department approval and Finance review

USE pilarweb;

CREATE TABLE IF NOT EXISTS request_approvals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  approval_rule_id BIGINT UNSIGNED DEFAULT NULL,
  approval_order INT NOT NULL DEFAULT 1,
  department_id INT DEFAULT NULL,
  department_name VARCHAR(255) DEFAULT NULL,
  required_job_level_value INT DEFAULT NULL,
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
  KEY idx_request_approvals_request (request_id, approval_order),
  KEY idx_request_approvals_status (status),
  KEY idx_request_approvals_approver (approver_user_id, status),
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
  decision VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  approved_qty DECIMAL(18,4) DEFAULT NULL,
  note VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_finance_review_items_review_item (finance_review_id, request_item_id),
  KEY idx_finance_review_items_request_item (request_item_id)
) ENGINE=InnoDB;
-- Pilarweb migration 005: Warehouse picking, actual quantity, NetSuite IT, and handover

USE pilarweb;

CREATE TABLE IF NOT EXISTS warehouse_fulfillments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  fulfillment_number VARCHAR(80) NOT NULL,
  status VARCHAR(80) NOT NULL DEFAULT 'PICKING',
  accepted_by_user_id VARCHAR(36) DEFAULT NULL,
  accepted_by_name VARCHAR(255) DEFAULT NULL,
  accepted_at DATETIME DEFAULT NULL,
  picked_by_user_id VARCHAR(36) DEFAULT NULL,
  picked_by_name VARCHAR(255) DEFAULT NULL,
  picked_at DATETIME DEFAULT NULL,
  print_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_printed_by_user_id VARCHAR(36) DEFAULT NULL,
  last_printed_by_name VARCHAR(255) DEFAULT NULL,
  last_printed_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_warehouse_fulfillments_number (fulfillment_number),
  KEY idx_warehouse_fulfillments_request (request_id),
  KEY idx_warehouse_fulfillments_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS warehouse_fulfillment_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fulfillment_id BIGINT UNSIGNED NOT NULL,
  request_item_id BIGINT UNSIGNED NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  requested_qty_snapshot DECIMAL(18,4) NOT NULL,
  finance_approved_qty_snapshot DECIMAL(18,4) DEFAULT NULL,
  actual_qty DECIMAL(18,4) NOT NULL DEFAULT 0,
  shortage_qty DECIMAL(18,4) NOT NULL DEFAULT 0,
  shortage_reason_code VARCHAR(80) DEFAULT NULL,
  shortage_note VARCHAR(500) DEFAULT NULL,
  remainder_disposition VARCHAR(80) NOT NULL DEFAULT 'NONE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_warehouse_fulfillment_items (fulfillment_id, request_item_id),
  KEY idx_warehouse_fulfillment_items_request_item (request_item_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS warehouse_inventory_transfers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fulfillment_id BIGINT UNSIGNED NOT NULL,
  inventory_transfer_number VARCHAR(100) NOT NULL,
  source_warehouse_id BIGINT UNSIGNED DEFAULT NULL,
  source_warehouse_code VARCHAR(80) NOT NULL,
  source_warehouse_name VARCHAR(150) DEFAULT NULL,
  destination_warehouse_id BIGINT UNSIGNED DEFAULT NULL,
  destination_warehouse_code VARCHAR(80) NOT NULL DEFAULT 'LOAN',
  destination_warehouse_name VARCHAR(150) DEFAULT 'Loan Warehouse',
  transfer_date DATE DEFAULT NULL,
  recorded_by_user_id VARCHAR(36) NOT NULL,
  recorded_by_name VARCHAR(255) DEFAULT NULL,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_warehouse_inventory_transfers_number (inventory_transfer_number),
  KEY idx_warehouse_inventory_transfers_fulfillment (fulfillment_id),
  KEY idx_warehouse_inventory_transfers_source (source_warehouse_code),
  KEY idx_warehouse_inventory_transfers_destination (destination_warehouse_code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS warehouse_inventory_transfer_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  inventory_transfer_id BIGINT UNSIGNED NOT NULL,
  fulfillment_item_id BIGINT UNSIGNED NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  transferred_qty DECIMAL(18,4) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_transfer_items (inventory_transfer_id, fulfillment_item_id),
  KEY idx_inventory_transfer_items_fulfillment_item (fulfillment_item_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS warehouse_handovers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  fulfillment_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(80) NOT NULL DEFAULT 'PENDING',
  handed_over_by_user_id VARCHAR(36) DEFAULT NULL,
  handed_over_by_name VARCHAR(255) DEFAULT NULL,
  received_by_user_id VARCHAR(36) DEFAULT NULL,
  received_by_name VARCHAR(255) DEFAULT NULL,
  handed_over_at DATETIME DEFAULT NULL,
  received_at DATETIME DEFAULT NULL,
  note VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_warehouse_handovers_request (request_id),
  UNIQUE KEY uq_warehouse_handovers_fulfillment (fulfillment_id),
  KEY idx_warehouse_handovers_status (status)
) ENGINE=InnoDB;
-- Pilarweb migration 006: returnable goods tracking

USE pilarweb;

CREATE TABLE IF NOT EXISTS returns (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  return_number VARCHAR(80) NOT NULL,
  status VARCHAR(80) NOT NULL DEFAULT 'PENDING',
  returned_by_user_id VARCHAR(36) DEFAULT NULL,
  returned_by_name VARCHAR(255) DEFAULT NULL,
  received_by_user_id VARCHAR(36) DEFAULT NULL,
  received_by_name VARCHAR(255) DEFAULT NULL,
  returned_at DATETIME DEFAULT NULL,
  inspected_at DATETIME DEFAULT NULL,
  note TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_returns_number (return_number),
  KEY idx_returns_request (request_id),
  KEY idx_returns_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS return_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  return_id BIGINT UNSIGNED NOT NULL,
  request_item_id BIGINT UNSIGNED NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  returned_qty DECIMAL(18,4) NOT NULL,
  stock_returned_qty DECIMAL(18,4) NOT NULL DEFAULT 0,
  condition_code VARCHAR(80) NOT NULL DEFAULT 'GOOD',
  condition_note VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_return_items_return (return_id),
  KEY idx_return_items_request_item (request_item_id)
) ENGINE=InnoDB;
-- Pilarweb migration 007: Finance periods and NetSuite Inventory Adjustment batches

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
  request_id VARCHAR(36) NOT NULL,
  request_number VARCHAR(80) NOT NULL,
  request_item_id BIGINT UNSIGNED NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  actual_issued_qty DECIMAL(18,4) NOT NULL,
  returned_qty DECIMAL(18,4) NOT NULL DEFAULT 0,
  source_warehouse_code VARCHAR(500) DEFAULT NULL,
  loan_warehouse_code VARCHAR(80) NOT NULL DEFAULT 'LOAN',
  inventory_transfer_number VARCHAR(500) DEFAULT NULL,
  adjustment_qty DECIMAL(18,4) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_adjustment_batch_items_batch (batch_id),
  KEY idx_adjustment_batch_items_request (request_id),
  KEY idx_adjustment_batch_items_item_code (item_code)
) ENGINE=InnoDB;
-- Pilarweb migration 008: comments and append-only business activity log

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
