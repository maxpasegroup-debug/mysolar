-- Commercial terms are versioned. No provider, invoice, payment or billing workflow is created.
CREATE FUNCTION commercial_rules_valid(f jsonb,l jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT coalesce(jsonb_typeof(f)='object' AND jsonb_typeof(l)='object'
 AND (SELECT count(*) FROM jsonb_each(f))=13 AND (SELECT count(*) FROM jsonb_each(l))=4
 AND NOT EXISTS(SELECT 1 FROM jsonb_each(f) x WHERE x.key<>ALL(ARRAY['storefront','catalogue','crm','quotations','orders','team','inventory','projects','finance','service','white_label','sia_ceo','custom_domain']) OR jsonb_typeof(x.value)<>'boolean')
 AND NOT EXISTS(SELECT 1 FROM jsonb_each(l) x WHERE x.key<>ALL(ARRAY['team','publishedOffers','siaDaily','siaMonthly']) OR (x.value<>'null'::jsonb AND (jsonb_typeof(x.value)<>'number' OR x.value::text !~ '^\d{1,8}$'))),false);
$$;
CREATE TABLE commercial_settings_versions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, data jsonb NOT NULL, effective_at timestamptz NOT NULL,
 created_by uuid REFERENCES users(id), reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(data->>'mode' IN ('pre_billing','controlled')),
 CHECK(commercial_rules_valid(data->'features',data->'limits')),
 CHECK(jsonb_typeof(data->'customerAssistantEnabled')='boolean')
);
CREATE TABLE commercial_control(id boolean PRIMARY KEY DEFAULT true CHECK(id),revision integer NOT NULL DEFAULT 1 CHECK(revision>0));
INSERT INTO commercial_control(id) VALUES(true);
INSERT INTO commercial_settings_versions(data,effective_at,reason)
 SELECT jsonb_build_object('mode','pre_billing','contact','Contact the platform administrator to discuss access. Online billing is disabled.',
 'setupFee',jsonb_build_object('amountPaise',proposed_setup_fee_paise::text,'currency','INR','taxMode','exclusive','taxRate',NULL,'enabled',false,'required',false,'description','Proposed one-time white-label setup fee plus applicable GST. Not a charge or payment demand.'),
 'features','{"storefront":true,"catalogue":true,"crm":true,"quotations":true,"orders":true,"team":true,"inventory":true,"projects":true,"finance":true,"service":true,"white_label":true,"sia_ceo":true,"custom_domain":false}'::jsonb,
 'limits','{"team":null,"publishedOffers":null,"siaDaily":null,"siaMonthly":null}'::jsonb,
 'customerAssistantEnabled',true,'customerSiaDaily',NULL,'customerSiaMonthly',NULL),now(),'Initial explicit pre-billing policy; imports the existing setup-fee proposal without generating charges.' FROM platform_settings WHERE id=true;
CREATE TABLE commercial_plans (
 id uuid PRIMARY KEY, code text NOT NULL UNIQUE CHECK(code ~ '^[a-z][a-z0-9_-]{2,39}$'),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','inactive')),revision integer NOT NULL DEFAULT 1,
 current_version_id uuid,created_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE commercial_plan_versions (
 id uuid PRIMARY KEY,plan_id uuid NOT NULL REFERENCES commercial_plans(id),version integer NOT NULL CHECK(version>0),terms jsonb NOT NULL,
 created_by uuid NOT NULL REFERENCES users(id),reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(plan_id,version),UNIQUE(id,plan_id),
 CHECK(commercial_rules_valid(terms->'features',terms->'limits')),
 CHECK(terms->>'interval' IN ('monthly','annual')),
 CHECK(terms->>'currency' IN ('INR','USD','EUR','GBP','AED')),
 CHECK(terms->'pricePaise'='null'::jsonb OR terms->>'pricePaise' ~ '^\d{1,12}$')
);
ALTER TABLE commercial_plans ADD FOREIGN KEY(current_version_id,id) REFERENCES commercial_plan_versions(id,plan_id);
CREATE TABLE company_subscriptions (
 id uuid PRIMARY KEY,company_id uuid NOT NULL REFERENCES companies(id),plan_id uuid NOT NULL REFERENCES commercial_plans(id),plan_version_id uuid NOT NULL,
 terms jsonb NOT NULL,setup_terms jsonb NOT NULL,settings_version_id bigint NOT NULL REFERENCES commercial_settings_versions(id),
 status text NOT NULL CHECK(status IN ('trial','pending_commercial_activation','active','past_due','suspended','cancelled','expired')),
 start_at timestamptz NOT NULL,end_at timestamptz NOT NULL CHECK(end_at>start_at),trial_granted boolean NOT NULL DEFAULT false,
 activation_source text NOT NULL DEFAULT 'manual_administration' CHECK(activation_source='manual_administration'),
 created_by uuid NOT NULL REFERENCES users(id),reason text NOT NULL,revision integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(commercial_rules_valid(terms->'features',terms->'limits')),
 FOREIGN KEY(plan_version_id,plan_id) REFERENCES commercial_plan_versions(id,plan_id),UNIQUE(id,company_id)
);
CREATE TABLE company_commercial_state(company_id uuid PRIMARY KEY REFERENCES companies(id),current_subscription_id uuid,revision integer NOT NULL DEFAULT 1,
 FOREIGN KEY(current_subscription_id,company_id) REFERENCES company_subscriptions(id,company_id));
CREATE TABLE commercial_subscription_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,company_id uuid NOT NULL REFERENCES companies(id),subscription_id uuid NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id),action text NOT NULL,previous jsonb,new_values jsonb NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(subscription_id,company_id) REFERENCES company_subscriptions(id,company_id)
);
CREATE TABLE commercial_usage(scope_key text NOT NULL,metric text NOT NULL CHECK(metric='sia_external_attempts'),period text NOT NULL CHECK(period IN ('day','month')),period_start date NOT NULL,
 requests integer NOT NULL DEFAULT 0 CHECK(requests>=0),PRIMARY KEY(scope_key,metric,period,period_start));
CREATE INDEX subscriptions_company_time ON company_subscriptions(company_id,created_at DESC);
CREATE INDEX commercial_events_company ON commercial_subscription_events(company_id,id DESC);
CREATE INDEX commercial_settings_effective ON commercial_settings_versions(effective_at DESC,id DESC);
CREATE FUNCTION commercial_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Commercial historical terms cannot be changed or removed'; END; $$;
CREATE TRIGGER settings_immutable BEFORE UPDATE OR DELETE ON commercial_settings_versions FOR EACH ROW EXECUTE FUNCTION commercial_immutable();
CREATE TRIGGER plans_terms_immutable BEFORE UPDATE OR DELETE ON commercial_plan_versions FOR EACH ROW EXECUTE FUNCTION commercial_immutable();
CREATE TRIGGER subscription_events_immutable BEFORE UPDATE OR DELETE ON commercial_subscription_events FOR EACH ROW EXECUTE FUNCTION commercial_immutable();
CREATE FUNCTION commercial_snapshot_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF ROW(NEW.company_id,NEW.plan_id,NEW.plan_version_id,NEW.terms,NEW.setup_terms,NEW.settings_version_id,NEW.start_at,NEW.trial_granted,NEW.activation_source,NEW.created_by,NEW.created_at) IS DISTINCT FROM ROW(OLD.company_id,OLD.plan_id,OLD.plan_version_id,OLD.terms,OLD.setup_terms,OLD.settings_version_id,OLD.start_at,OLD.trial_granted,OLD.activation_source,OLD.created_by,OLD.created_at) THEN RAISE EXCEPTION 'Subscription agreement snapshot is immutable'; END IF;RETURN NEW;END; $$;
CREATE TRIGGER subscription_snapshot_immutable BEFORE UPDATE ON company_subscriptions FOR EACH ROW EXECUTE FUNCTION commercial_snapshot_immutable();
CREATE TRIGGER subscriptions_no_delete BEFORE DELETE ON company_subscriptions FOR EACH ROW EXECUTE FUNCTION commercial_immutable();
-- One policy resolver is used by private action guards and public projection gates.
CREATE FUNCTION commercial_policy(target uuid) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE cfg commercial_settings_versions%ROWTYPE; sub company_subscriptions%ROWTYPE; state text; BEGIN
 SELECT * INTO cfg FROM commercial_settings_versions WHERE effective_at<=now() ORDER BY effective_at DESC,id DESC LIMIT 1;
 IF NOT FOUND THEN RETURN jsonb_build_object('mode','unavailable','status','not_configured','features','{}'::jsonb,'limits','{}'::jsonb,'writable',false);END IF;
 IF target IS NOT NULL THEN SELECT s.* INTO sub FROM company_commercial_state c JOIN company_subscriptions s ON s.id=c.current_subscription_id AND s.company_id=c.company_id WHERE c.company_id=target;END IF;
 IF sub.id IS NOT NULL THEN
  state:=CASE WHEN sub.status IN ('active','trial','past_due') AND sub.end_at<=now() THEN 'expired' WHEN sub.status IN ('active','trial') AND sub.start_at>now() THEN 'pending_commercial_activation' ELSE sub.status END;
  RETURN jsonb_build_object('mode','assigned_subscription','status',state,'recordedStatus',sub.status,'features',coalesce(sub.terms->'features','{}'::jsonb),'limits',coalesce(sub.terms->'limits','{}'::jsonb),'writable',state IN ('active','trial'),'subscriptionId',sub.id,'startAt',sub.start_at,'endAt',sub.end_at,'settingsVersion',cfg.id,'contact',cfg.data->>'contact');
 END IF;
 RETURN jsonb_build_object('mode',cfg.data->>'mode','status','not_configured','features',cfg.data->'features','limits',cfg.data->'limits','writable',cfg.data->>'mode'='pre_billing','settingsVersion',cfg.id,'contact',cfg.data->>'contact','customerAssistantEnabled',cfg.data->'customerAssistantEnabled','customerSiaDaily',cfg.data->'customerSiaDaily','customerSiaMonthly',cfg.data->'customerSiaMonthly');
END; $$;
CREATE FUNCTION commercial_public_allowed(target uuid,feature text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT coalesce((commercial_policy(target)->>'writable')::boolean,false) AND coalesce((commercial_policy(target)->'features'->>feature)::boolean,false); $$;
CREATE OR REPLACE VIEW marketplace_vendors AS
 SELECT c.id,b.public_name AS name,c.city,p.business_type,b.description,b.logo_url,b.primary_color,b.secondary_color,b.accent_color,
 b.welcome_text,b.public_email,b.public_phone,b.appearance,s.services,s.rooftop_available,s.service_areas,s.preferred_contact
 FROM companies c JOIN company_branding b ON b.company_id=c.id JOIN company_profiles p ON p.company_id=c.id JOIN company_business_profiles s ON s.company_id=c.id
 WHERE c.status='active' AND c.lifecycle='active' AND c.marketplace_status='approved' AND c.storefront_published
 AND commercial_public_allowed(c.id,'storefront')
 AND b.public_name<>'' AND b.description<>'' AND ((s.preferred_contact='email' AND b.public_email<>'') OR (s.preferred_contact='phone' AND b.public_phone<>''))
 AND EXISTS(SELECT 1 FROM company_reviews r WHERE r.company_id=c.id AND r.kind='marketplace' AND r.new_state='approved');
CREATE OR REPLACE VIEW marketplace_offers AS
 SELECT o.id,o.company_id,o.product_id,o.distributor_sku,o.price_mode,o.price_paise,o.currency,o.price_unit,o.estimated,o.tax_mode,o.tax_rate,o.availability,
 o.stock_maintained,o.stock_quantity,o.minimum_order,o.coverage_labels,o.public_terms,o.updated_at
 FROM distributor_offers o JOIN marketplace_vendors v ON v.id=o.company_id JOIN marketplace_products p ON p.id=o.product_id
 WHERE o.published AND o.status='approved' AND o.approved_revision=o.revision AND o.approved_product_revision=p.revision
 AND commercial_public_allowed(o.company_id,'catalogue')
 AND o.coverage_labels <@ ARRAY(SELECT a.label FROM company_service_areas a WHERE a.company_id=o.company_id);
INSERT INTO permissions(id,scope) VALUES ('platform.commercial.read','platform'),('platform.commercial.settings','platform'),('platform.commercial.plans','platform'),('platform.commercial.subscriptions','platform'),('platform.commercial.activate','platform'),('subscription.read','company');
INSERT INTO role_permissions(role_id,permission_id) SELECT 'platform_admin',id FROM permissions WHERE id LIKE 'platform.commercial.%';
INSERT INTO role_permissions(role_id,permission_id) VALUES('owner','subscription.read');
