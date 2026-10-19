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
