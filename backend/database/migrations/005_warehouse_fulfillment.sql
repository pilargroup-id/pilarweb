-- Pilarweb migration 005: simplified Warehouse picking, IWT, DO, and handover
-- One Finance-approved request creates exactly one fulfillment.

USE pilarweb;

CREATE TABLE IF NOT EXISTS warehouse_fulfillments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id VARCHAR(36) NOT NULL,
  fulfillment_number VARCHAR(80) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PICKING',
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
  KEY idx_warehouse_fulfillments_status (status, updated_at)
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
  source_warehouse_id BIGINT UNSIGNED DEFAULT NULL,
  source_warehouse_code VARCHAR(80) DEFAULT NULL,
  source_warehouse_name VARCHAR(150) DEFAULT NULL,
  inventory_transfer_number VARCHAR(100) DEFAULT NULL,
  inventory_transfer_recorded_at DATETIME DEFAULT NULL,
  note VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_warehouse_fulfillment_items_request_item (fulfillment_id, request_item_id),
  KEY idx_warehouse_fulfillment_items_fulfillment (fulfillment_id),
  KEY idx_warehouse_fulfillment_items_request_item (request_item_id),
  KEY idx_warehouse_fulfillment_items_iwt (inventory_transfer_number)
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
