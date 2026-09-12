CREATE UNIQUE INDEX IF NOT EXISTS runs_active_chat_session ON runs(trigger_message_id, agent_id) WHERE trigger_message_id IS NOT NULL AND status IN ('queued','preparing','running','awaiting');
