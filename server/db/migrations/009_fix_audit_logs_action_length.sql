-- 009_fix_audit_logs_action_length.sql
-- Extend audit_logs.action from varchar(20) to varchar(30).
-- 'PASSWORD_RESET_REQUESTED' and 'PASSWORD_RESET_COMPLETED' are 24 chars
-- and were being rejected by the column constraint.

ALTER TABLE audit_logs ALTER COLUMN action TYPE varchar(30);
