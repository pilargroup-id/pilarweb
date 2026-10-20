USE pilarweb;

-- Defensive guard: database/migrations/001_master_configuration.sql creates this table with
-- `CREATE TABLE IF NOT EXISTS`, so a database that already had warehouse_locations before
-- internal_id was added to that migration never received the column, which makes the INSERT
-- below fail with "Unknown column 'internal_id'". Add it (and its unique key) here if missing.
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'warehouse_locations' AND COLUMN_NAME = 'internal_id'
);
SET @ddl = IF(@col_exists = 0,
  'ALTER TABLE warehouse_locations ADD COLUMN internal_id BIGINT UNSIGNED DEFAULT NULL COMMENT ''Optional NetSuite Location Internal ID'' AFTER code',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @key_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'warehouse_locations' AND INDEX_NAME = 'uq_warehouse_locations_internal_id'
);
SET @ddl = IF(@key_exists = 0,
  'ALTER TABLE warehouse_locations ADD UNIQUE KEY uq_warehouse_locations_internal_id (internal_id)',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Source: warehouse.xlsx / Locations. internal_id is optional and represents NetSuite Location Internal ID.
INSERT INTO warehouse_locations (internal_id, code, name, is_active)
VALUES
  (18, '10001_BT_TNG_PSLAMA', '10001-BT-TNG-Pslama', 1),
  (21, '10002_BT_TNG_PORIS', '10002-BT-TNG-Poris', 1),
  (33, '10007_BT_TGR_BOROBUDUR', '10007-BT-TGR-Borobudur', 1),
  (34, '10008_BT_TNG_CILEDUG', '10008-BT-TNG-Ciledug', 1),
  (42, '10010_BT_TGR_KELAPA_DUA', '10010-BT-TGR-Kelapa Dua', 1),
  (38, '10011_BT_TGR_SEPATAN', '10011-BT-TGR-Sepatan', 1),
  (39, '10012_BT_CPT_PAMULANG', '10012-BT-CPT-Pamulang', 1),
  (41, '10013_BT_TNG_CILEDUG_INDAH', '10013-BT-TNG-Ciledug Indah', 1),
  (43, '10014_BT_TGR_DASANA_INDAH', '10014-BT-TGR-Dasana Indah', 1),
  (45, 'B2B', 'B2B', 1),
  (20, 'DISPLAY', 'Display', 1),
  (1, 'GARUDA', 'Garuda', 1),
  (4, 'GOSAVE', 'Gosave', 1),
  (47, 'GOSAVE_E_COMMERCE', 'Gosave E-Commerce', 1),
  (49, 'GOSAVE_SOLD', 'GOSAVE SOLD', 1),
  (31, 'GOTO_BULKY', 'GOTO Bulky', 1),
  (19, 'GOTO_GUDANG_MINIM', 'Goto Gudang Minim', 1),
  (46, 'GOTO_GUDANG_SUPPORT', 'Goto Gudang Support', 1),
  (48, 'GOTO_KS_TUBUN', 'GOTO KS Tubun', 1),
  (32, 'GOTO_REJECT', 'GOTO REJECT', 1),
  (36, 'GOTO_RETAIL', 'GOTO Retail', 1),
  (7, 'GOTO_SOLD', 'GOTO SOLD', 1),
  (8, 'INTRANSIT', 'InTransit', 1),
  (25, 'KS_TUBUN', 'KS Tubun', 1),
  (24, 'KS_TUBUN_REJECT', 'KS Tubun Reject', 1),
  (11, 'LOAN', 'Loan', 1),
  (12, 'REJECT_OFFLINE', 'Reject Offline', 1),
  (13, 'RETURN', 'Return', 1),
  (14, 'RETURN_TEMPORARY', 'Return Temporary', 1),
  (15, 'VENDER', 'Vender', 1)
ON DUPLICATE KEY UPDATE
  internal_id = VALUES(internal_id),
  name = VALUES(name),
  is_active = VALUES(is_active);
