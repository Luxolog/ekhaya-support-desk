-- One-time, hashed unsubscribe tokens. Public GET requests never consume tokens;
-- only an explicit POST can record a channel-specific withdrawal.
CREATE TABLE support.marketing_unsubscribe_tokens (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES support.workspaces(id) ON DELETE CASCADE,
 customer_id uuid REFERENCES support.customers(id) ON DELETE CASCADE,
 lead_id uuid REFERENCES support.leads(id) ON DELETE CASCADE,
 channel text NOT NULL CHECK (channel IN ('email','whatsapp','sms')),
 consent_event_id uuid NOT NULL REFERENCES support.marketing_consents(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((customer_id IS NOT NULL)::int + (lead_id IS NOT NULL)::int = 1)
);
CREATE INDEX marketing_unsubscribe_tokens_expiry_idx
 ON support.marketing_unsubscribe_tokens(expires_at)
 WHERE consumed_at IS NULL;
CREATE INDEX marketing_unsubscribe_tokens_workspace_customer_idx
 ON support.marketing_unsubscribe_tokens(workspace_id,customer_id,channel);
CREATE INDEX marketing_unsubscribe_tokens_workspace_lead_idx
 ON support.marketing_unsubscribe_tokens(workspace_id,lead_id,channel);
