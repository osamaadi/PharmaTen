-- Audit log entries must be append-only: no deletion, no in-place edits
-- (PRD Section 10; ALCOA+ in Section 8). Enforced at the database layer so
-- no application code path — including raw SQL — can silently rewrite history.

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log_entries is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'raise_exception';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_entries_append_only
  BEFORE UPDATE OR DELETE ON "audit_log_entries"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();
