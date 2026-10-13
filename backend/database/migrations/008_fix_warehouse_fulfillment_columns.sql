-- Pilarweb migration 008: bring warehouse_fulfillments and warehouse_fulfillment_items
-- up to date on databases that already ran an older version of migration 005.
--
-- Migration 005 was edited in place (not versioned) to simplify the warehouse flow,
-- but its CREATE TABLE IF NOT EXISTS statements are no-ops on a database where the
-- tables already exist, so the new columns referenced by warehouse.service.js
-- (do_print_count, picking_print_count, inventory_transfer_number, etc.) never
-- reached databases that were migrated before that edit. This fix is additive only:
-- it never drops or renames an existing column, so it is safe to run on a database
-- that is already up to date (every ADD is guarded) and on one that still has data
-- under the old column names.

USE pilarweb;

DELIMITER $$

DROP PROCEDURE IF EXISTS pw_add_column_if_not_exists $$
CREATE PROCEDURE pw_add_column_if_not_exists(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DELIMITER ;

-- warehouse_fulfillments
CALL pw_add_column_if_not_exists('warehouse_fulfillments', 'created_by_user_id', 'VARCHAR(36) DEFAULT NULL');
CALL pw_add_column_if_not_exists('warehouse_fulfillments', 'created_by_name', 'VARCHAR(255) DEFAULT NULL');
CALL pw_add_column_if_not_exists('warehouse_fulfillments', 'picking_print_count', 'INT UNSIGNED NOT NULL DEFAULT 0');
CALL pw_add_column_if_not_exists('warehouse_fulfillments', 'last_picking_printed_by_user_id', 'VARCHAR(36) DEFAULT NULL');
CALL pw_add_column_if_not_exists('warehouse_fulfillments', 'last_picking_printed_by_name', 'VARCHAR(255) DEFAULT NULL');
CALL pw_add_column_if_not_exists('warehouse_fulfillments', 'last_picking_printed_at', 'DATETIME DEFAULT NULL');
CALL pw_add_column_if_not_exists('warehouse_fulfillments', 'progress_saved_by_user_id', 'VARCHAR(36) DEFAULT NULL');
CALL pw_add_column_if_not_exists('warehouse_fulfillments', 'progress_saved_by_name', 'VARCHAR(255) DEFAULT NULL');
CALL pw_add_column_if_not_exists('warehouse_fulfillments', 'progress_saved_at', 'DATETIME DEFAULT NULL');
CALL pw_add_column_if_not_exists('warehouse_fulfillments', 'picking_completed_by_user_id', 'VARCHAR(36) DEFAULT NULL');
CALL pw_add_column_if_not_exists('warehouse_fulfillments', 'picking_completed_by_name', 'VARCHAR(255) DEFAULT NULL');
CALL pw_add_column_if_not_exists('warehouse_fulfillments', 'picking_completed_at', 'DATETIME DEFAULT NULL');
CALL pw_add_column_if_not_exists('warehouse_fulfillments', 'do_print_count', 'INT UNSIGNED NOT NULL DEFAULT 0');
CALL pw_add_column_if_not_exists('warehouse_fulfillments', 'last_do_printed_by_user_id', 'VARCHAR(36) DEFAULT NULL');
CALL pw_add_column_if_not_exists('warehouse_fulfillments', 'last_do_printed_by_name', 'VARCHAR(255) DEFAULT NULL');
CALL pw_add_column_if_not_exists('warehouse_fulfillments', 'last_do_printed_at', 'DATETIME DEFAULT NULL');

-- warehouse_fulfillment_items
CALL pw_add_column_if_not_exists('warehouse_fulfillment_items', 'finance_rejected_qty_snapshot', 'DECIMAL(18,4) NOT NULL DEFAULT 0');
CALL pw_add_column_if_not_exists('warehouse_fulfillment_items', 'source_warehouse_id', 'BIGINT UNSIGNED DEFAULT NULL');
CALL pw_add_column_if_not_exists('warehouse_fulfillment_items', 'source_warehouse_code', 'VARCHAR(80) DEFAULT NULL');
CALL pw_add_column_if_not_exists('warehouse_fulfillment_items', 'source_warehouse_name', 'VARCHAR(150) DEFAULT NULL');
CALL pw_add_column_if_not_exists('warehouse_fulfillment_items', 'inventory_transfer_number', 'VARCHAR(100) DEFAULT NULL');
CALL pw_add_column_if_not_exists('warehouse_fulfillment_items', 'inventory_transfer_recorded_at', 'DATETIME DEFAULT NULL');
CALL pw_add_column_if_not_exists('warehouse_fulfillment_items', 'note', 'VARCHAR(500) DEFAULT NULL');

DROP PROCEDURE IF EXISTS pw_add_column_if_not_exists;
