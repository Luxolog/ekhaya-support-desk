-- Ekhaya Support Desk additive school CRM / knowledge / marketing foundation.
-- Prepared and validated on a temporary Neon branch on 2026-11-21.
-- NOT applied to the production branch. Review and apply only through the approved migration workflow.
CREATE TABLE support.workspace_settings (
 workspace_id uuid PRIMARY KEY REFERENCES support.workspaces(id) ON DELETE CASCADE,
 organisation_type text NOT NULL DEFAULT 'business' CHECK (organisation_type IN ('school','college','business')),
 display_name text, phone text, website text, address text, support_hours text,
 settings jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE support.departments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES support.workspaces(id) ON DELETE CASCADE,
 name text NOT NULL, description text, is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (workspace_id,name), UNIQUE (workspace_id,id)
);
CREATE TABLE support.leads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES support.workspaces(id) ON DELETE CASCADE,
 department_id uuid,
 assigned_to uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
 full_name text NOT NULL, email text, phone text,
 enquiry_type text NOT NULL DEFAULT 'general', source text NOT NULL DEFAULT 'manual',
 interest text, message text,
 status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','follow_up_required','interested','application_started','converted','not_interested','closed')),
 follow_up_at timestamptz, outcome text,
 consent_status text NOT NULL DEFAULT 'unknown' CHECK (consent_status IN ('unknown','granted','withdrawn')),
 consent_at timestamptz, consent_source text, opted_out_at timestamptz,
 converted_customer_id uuid REFERENCES support.customers(id) ON DELETE SET NULL,
 created_by uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT leads_department_workspace_fk FOREIGN KEY (workspace_id,department_id) REFERENCES support.departments(workspace_id,id) ON DELETE NO ACTION
);
CREATE INDEX leads_workspace_status_created_idx ON support.leads(workspace_id,status,created_at DESC);
CREATE INDEX leads_workspace_followup_idx ON support.leads(workspace_id,follow_up_at) WHERE follow_up_at IS NOT NULL;
CREATE TABLE support.lead_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES support.workspaces(id) ON DELETE CASCADE,
 lead_id uuid NOT NULL REFERENCES support.leads(id) ON DELETE CASCADE,
 actor_user_id uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
 event_type text NOT NULL, details jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lead_events_workspace_lead_idx ON support.lead_events(workspace_id,lead_id,created_at DESC);
CREATE TABLE support.knowledge_articles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES support.workspaces(id) ON DELETE CASCADE,
 title text NOT NULL, slug text NOT NULL, category text NOT NULL DEFAULT 'general', body text NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
 created_by uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
 updated_by uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
 published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,slug)
);
CREATE INDEX knowledge_articles_published_idx ON support.knowledge_articles(workspace_id,status,category);
CREATE TABLE support.marketing_campaigns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES support.workspaces(id) ON DELETE CASCADE,
 name text NOT NULL, channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','whatsapp','sms','social')),
 subject text, body text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','scheduled','sent','cancelled')),
 scheduled_at timestamptz, approved_by uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
 approved_at timestamptz, created_by uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX marketing_campaigns_workspace_status_idx ON support.marketing_campaigns(workspace_id,status,created_at DESC);
CREATE TABLE support.marketing_consents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES support.workspaces(id) ON DELETE CASCADE,
 customer_id uuid REFERENCES support.customers(id) ON DELETE CASCADE,
 lead_id uuid REFERENCES support.leads(id) ON DELETE CASCADE,
 channel text NOT NULL CHECK (channel IN ('email','whatsapp','sms')),
 consent_status text NOT NULL CHECK (consent_status IN ('granted','withdrawn')),
 consent_text text, source text, recorded_by uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
 recorded_at timestamptz NOT NULL DEFAULT now(), CHECK (customer_id IS NOT NULL OR lead_id IS NOT NULL)
);
CREATE INDEX marketing_consents_workspace_customer_idx ON support.marketing_consents(workspace_id,customer_id,channel,recorded_at DESC);
CREATE TABLE support.ai_usage (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES support.workspaces(id) ON DELETE CASCADE,
 feature text NOT NULL, provider text NOT NULL DEFAULT 'mock',
 input_units integer NOT NULL DEFAULT 0 CHECK (input_units >= 0),
 output_units integer NOT NULL DEFAULT 0 CHECK (output_units >= 0),
 created_by uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_workspace_created_idx ON support.ai_usage(workspace_id,created_at DESC);

-- Supports efficient per-lead, per-channel consent state lookups (latest event wins).
CREATE INDEX marketing_consents_workspace_lead_channel_idx ON support.marketing_consents(workspace_id,lead_id,channel,recorded_at DESC,id DESC);
