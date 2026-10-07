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
  shortage_reason_code ENUM('STOCK_SHORTAGE','DAMAGED','NOT_FOUND','OTHER') DEFAULT NULL,
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
  KEY idx_warehouse_handovers_fulfillment (fulfillment_id),
  KEY idx_warehouse_handovers_status (status)
) ENGINE=InnoDB;
