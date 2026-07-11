-- TRUNCATE bypasses row-level triggers, so block it separately — the audit
-- trail must survive every deletion path (PRD Section 10).

CREATE TRIGGER audit_log_entries_no_truncate
  BEFORE TRUNCATE ON "audit_log_entries"
  FOR EACH STATEMENT
  EXECUTE FUNCTION prevent_audit_log_mutation();
