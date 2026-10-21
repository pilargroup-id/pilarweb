USE pilarweb;
INSERT INTO validation_override_users (user_id,name,is_active) VALUES
('17808bc0-9d46-4103-a384-735562f71c12','Al Fatih Zainul Falah',1),
('3ee1bae7-f256-44c1-8b38-fc38039fab92','Apriyanto',1),
('bd625aff-7fc4-44e9-b95c-549f99f47991','Azi Fauzi',1),
('d9d98720-ac7f-4798-8612-fef103acf07d','Bayu Noegroho',1),
('834110d0-bd59-4bd1-81a9-03e9341fb6e4','Yulliemty',1)
ON DUPLICATE KEY UPDATE name=VALUES(name),is_active=VALUES(is_active);
