USE pilarweb;
-- Department-based operational access
INSERT INTO module_access_rules (module_code,department_id,priority,is_active)
SELECT 'FINANCE',7,100,1 WHERE NOT EXISTS (SELECT 1 FROM module_access_rules WHERE module_code='FINANCE' AND department_id=7 AND user_id IS NULL);
INSERT INTO module_access_rules (module_code,department_id,priority,is_active)
SELECT 'WAREHOUSE',5,100,1 WHERE NOT EXISTS (SELECT 1 FROM module_access_rules WHERE module_code='WAREHOUSE' AND department_id=5 AND user_id IS NULL);
INSERT INTO module_access_rules (module_code,department_id,priority,is_active)
SELECT 'WAREHOUSE',6,100,1 WHERE NOT EXISTS (SELECT 1 FROM module_access_rules WHERE module_code='WAREHOUSE' AND department_id=6 AND user_id IS NULL);
INSERT INTO module_access_rules (module_code,department_id,priority,is_active)
SELECT 'FINANCE',8,100,1 WHERE NOT EXISTS (SELECT 1 FROM module_access_rules WHERE module_code='FINANCE' AND department_id=8 AND user_id IS NULL);
INSERT INTO module_access_rules (module_code,department_id,priority,is_active)
SELECT 'WAREHOUSE',8,100,1 WHERE NOT EXISTS (SELECT 1 FROM module_access_rules WHERE module_code='WAREHOUSE' AND department_id=8 AND user_id IS NULL);

-- ADMIN: user-specific bootstrap access.
INSERT INTO module_access_rules (module_code,user_id,name,priority,is_active)
SELECT 'ADMIN','17808bc0-9d46-4103-a384-735562f71c12','Al Fatih Zainul Falah',1,1
WHERE NOT EXISTS (SELECT 1 FROM module_access_rules WHERE module_code='ADMIN' AND user_id='17808bc0-9d46-4103-a384-735562f71c12');
INSERT INTO module_access_rules (module_code,user_id,name,priority,is_active)
SELECT 'ADMIN','3ee1bae7-f256-44c1-8b38-fc38039fab92','Apriyanto',1,1
WHERE NOT EXISTS (SELECT 1 FROM module_access_rules WHERE module_code='ADMIN' AND user_id='3ee1bae7-f256-44c1-8b38-fc38039fab92');
INSERT INTO module_access_rules (module_code,user_id,name,priority,is_active)
SELECT 'ADMIN','bd625aff-7fc4-44e9-b95c-549f99f47991','Azi Fauzi',1,1
WHERE NOT EXISTS (SELECT 1 FROM module_access_rules WHERE module_code='ADMIN' AND user_id='bd625aff-7fc4-44e9-b95c-549f99f47991');
INSERT INTO module_access_rules (module_code,user_id,name,priority,is_active)
SELECT 'ADMIN','d9d98720-ac7f-4798-8612-fef103acf07d','Bayu Noegroho',1,1
WHERE NOT EXISTS (SELECT 1 FROM module_access_rules WHERE module_code='ADMIN' AND user_id='d9d98720-ac7f-4798-8612-fef103acf07d');
INSERT INTO module_access_rules (module_code,user_id,name,priority,is_active)
SELECT 'ADMIN','834110d0-bd59-4bd1-81a9-03e9341fb6e4','Yulliemty',1,1
WHERE NOT EXISTS (SELECT 1 FROM module_access_rules WHERE module_code='ADMIN' AND user_id='834110d0-bd59-4bd1-81a9-03e9341fb6e4');

-- Warehouse discrepancy supervisor access, scoped by the user's warehouse department.
INSERT INTO module_access_rules (module_code,user_id,name,department_id,priority,is_active)
SELECT 'WAREHOUSE_DISCREPANCY_SUPERVISOR','b8d631ad-6921-45d0-9920-0ae02739b767','M.Rizky Fahrizal Lubis',5,1,1
WHERE NOT EXISTS (SELECT 1 FROM module_access_rules WHERE module_code='WAREHOUSE_DISCREPANCY_SUPERVISOR' AND user_id='b8d631ad-6921-45d0-9920-0ae02739b767');
INSERT INTO module_access_rules (module_code,user_id,name,department_id,priority,is_active)
SELECT 'WAREHOUSE_DISCREPANCY_SUPERVISOR','c6dba7cd-019c-4c66-a52a-398626b3357d','Nurna Bella AP.',6,1,1
WHERE NOT EXISTS (SELECT 1 FROM module_access_rules WHERE module_code='WAREHOUSE_DISCREPANCY_SUPERVISOR' AND user_id='c6dba7cd-019c-4c66-a52a-398626b3357d');
