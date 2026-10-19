USE pilarweb;

-- Dedicated Validation Override access. Add/remove users through Admin master endpoints.
INSERT INTO validation_override_users
  (user_id, user_name_snapshot, is_active, created_by_user_id, created_by_name)
VALUES
  ('bd625aff-7fc4-44e9-b95c-549f99f47991', 'Azi Fauzi', 1, 'bd625aff-7fc4-44e9-b95c-549f99f47991', 'Azi Fauzi')
ON DUPLICATE KEY UPDATE
  user_name_snapshot = VALUES(user_name_snapshot),
  is_active = VALUES(is_active);
