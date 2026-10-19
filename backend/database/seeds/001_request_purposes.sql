USE pilarweb;

-- Default baseline. Admin can change return_type later without affecting historical request snapshots.
INSERT INTO master_request_purposes
  (code, name, description, return_type, sort_order, is_active)
VALUES
  ('TIKTOK_AFFILIATE', 'TikTok Affiliate', 'Goods requested for TikTok affiliate activities.', 'NON_RETURNABLE', 10, 1),
  ('YOUTUBE_AFFILIATE', 'YouTube Affiliate', 'Goods requested for YouTube affiliate activities.', 'NON_RETURNABLE', 20, 1),
  ('EXTERNAL_DELIVERY', 'External Delivery', 'Goods sent or handed over to an external party.', 'NON_RETURNABLE', 30, 1),
  ('INTERNAL_USE', 'Internal Use', 'Goods requested for internal company use.', 'NON_RETURNABLE', 40, 1),
  ('LOAN', 'Loan', 'Goods that must be returned by the requester department.', 'RETURNABLE', 50, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  return_type = VALUES(return_type),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);
