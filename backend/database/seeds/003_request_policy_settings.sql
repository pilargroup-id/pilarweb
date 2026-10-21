USE pilarweb;
INSERT INTO request_policy_settings (
 receipt_confirmation_days,discrepancy_resolution_days,discrepancy_escalation_days,
 discrepancy_supervisor_lock_days,return_due_days,timezone,is_active
)
SELECT 2,2,3,5,14,'Asia/Jakarta',1
WHERE NOT EXISTS (SELECT 1 FROM request_policy_settings WHERE is_active=1);
