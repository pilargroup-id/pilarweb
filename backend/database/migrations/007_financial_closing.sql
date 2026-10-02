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
  source_warehouse_code VARCHAR(80) DEFAULT NULL,
  loan_warehouse_code VARCHAR(80) NOT NULL DEFAULT 'LOAN',
  inventory_transfer_number VARCHAR(100) DEFAULT NULL,
  adjustment_qty DECIMAL(18,4) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_adjustment_batch_items_batch (batch_id),
  KEY idx_adjustment_batch_items_request (request_id),
  KEY idx_adjustment_batch_items_item_code (item_code)
) ENGINE=InnoDB;
