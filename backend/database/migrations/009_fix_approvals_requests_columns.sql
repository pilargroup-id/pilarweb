-- Pilarweb migration 009: bring `requests`, `request_approvals`, and `finance_review_items`
-- up to date on databases that already ran older versions of migrations 003 and 004.
--
-- Those migrations use CREATE TABLE IF NOT EXISTS and were edited in place several times
-- (new columns added to the same CREATE TABLE statement instead of a new migration file),
-- so on a database where the tables already existed, those edits were no-ops and the new
-- columns never arrived. This surfaced as "Database schema is out of date" on the
-- Approvals, Finance Review, and Warehouse screens, which all select the missing columns.
-- This fix is additive only: it never drops or renames an existing column, so it is safe
-- to run on a database that is already up to date (every ADD is guarded).

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

-- requests
CALL pw_add_column_if_not_exists('requests', 'purpose_return_type', "ENUM('NON_RETURNABLE','RETURNABLE') NOT NULL DEFAULT 'NON_RETURNABLE'");
CALL pw_add_column_if_not_exists('requests', 'target_department_id', 'INT DEFAULT NULL');
CALL pw_add_column_if_not_exists('requests', 'target_department_name', 'VARCHAR(255) DEFAULT NULL');
CALL pw_add_column_if_not_exists('requests', 'return_due_date', 'DATE DEFAULT NULL');
CALL pw_add_column_if_not_exists('requests', 'reverted_at', 'DATETIME DEFAULT NULL');
CALL pw_add_column_if_not_exists('requests', 'reverted_by_user_id', 'VARCHAR(36) DEFAULT NULL');
CALL pw_add_column_if_not_exists('requests', 'reverted_by_name', 'VARCHAR(255) DEFAULT NULL');
CALL pw_add_column_if_not_exists('requests', 'revert_reason', 'TEXT DEFAULT NULL');

-- request_approvals
CALL pw_add_column_if_not_exists('request_approvals', 'department_id', 'INT DEFAULT NULL');
CALL pw_add_column_if_not_exists('request_approvals', 'department_name', 'VARCHAR(255) DEFAULT NULL');
CALL pw_add_column_if_not_exists('request_approvals', 'required_job_level_value', 'INT DEFAULT NULL');
CALL pw_add_column_if_not_exists('request_approvals', 'required_job_level_name', 'VARCHAR(150) DEFAULT NULL');
CALL pw_add_column_if_not_exists('request_approvals', 'allow_higher_job_level', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL pw_add_column_if_not_exists('request_approvals', 'reverted_at', 'DATETIME DEFAULT NULL');
CALL pw_add_column_if_not_exists('request_approvals', 'reverted_by_user_id', 'VARCHAR(36) DEFAULT NULL');
CALL pw_add_column_if_not_exists('request_approvals', 'reverted_by_name', 'VARCHAR(255) DEFAULT NULL');
CALL pw_add_column_if_not_exists('request_approvals', 'revert_reason', 'TEXT DEFAULT NULL');

-- finance_review_items
CALL pw_add_column_if_not_exists('finance_review_items', 'requested_qty_snapshot', 'DECIMAL(18,4) NOT NULL DEFAULT 0');
CALL pw_add_column_if_not_exists('finance_review_items', 'rejected_qty', 'DECIMAL(18,4) NOT NULL DEFAULT 0');

DROP PROCEDURE IF EXISTS pw_add_column_if_not_exists;
