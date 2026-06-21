
-- ============ PLANS ============
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_ngn integer NOT NULL DEFAULT 0,
  interval text NOT NULL DEFAULT 'month' CHECK (interval IN ('month','year','lifetime')),
  trial_days integer NOT NULL DEFAULT 0,
  max_patients integer,
  max_clinicians integer,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT USING (is_active = true);
CREATE POLICY "plans_admin_all" ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed plans
INSERT INTO public.plans (code,name,description,price_ngn,interval,trial_days,max_patients,max_clinicians,features,sort_order) VALUES
('free','Free','Core vitals & alerts for solo use',0,'month',0,5,1,'["Core vitals","Basic alerts"]'::jsonb,1),
('nurse_pro','Nurse Pro','Unlimited patients, AI notes, handovers',5000,'month',14,NULL,1,'["Unlimited patients","AI nursing notes","Shift handovers"]'::jsonb,2),
('home_care','Home Care','Home visits + caregiver linking',8000,'month',14,NULL,2,'["Home visits","GPS check-in","Caregiver linking"]'::jsonb,3),
('clinic','Clinic','Up to 25 clinicians + analytics',25000,'month',14,NULL,25,'["Analytics","Priority support"]'::jsonb,4),
('hospital','Hospital','Unlimited clinicians + admin console',100000,'month',14,NULL,NULL,'["Admin console","SLA","Onboarding"]'::jsonb,5);

-- ============ SUBSCRIPTIONS ============
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code text NOT NULL REFERENCES public.plans(code),
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','canceled','expired')),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  paystack_customer_code text,
  paystack_subscription_code text,
  paystack_authorization_code text,
  last_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_own_read" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "subs_admin_read" ON public.subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX subs_user_idx ON public.subscriptions(user_id);
CREATE INDEX subs_status_idx ON public.subscriptions(status);

-- ============ PAYMENT TRANSACTIONS ============
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code text REFERENCES public.plans(code),
  reference text NOT NULL UNIQUE,
  amount_ngn integer NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','abandoned','reversed')),
  channel text,
  paystack_event text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pay_own_read" ON public.payment_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "pay_admin_read" ON public.payment_transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER payment_transactions_updated_at BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX pay_user_idx ON public.payment_transactions(user_id);

-- ============ WALLET ============
CREATE TABLE public.wallet_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_ngn integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_accounts TO authenticated;
GRANT ALL ON public.wallet_accounts TO service_role;
ALTER TABLE public.wallet_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_own_read" ON public.wallet_accounts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER wallet_updated_at BEFORE UPDATE ON public.wallet_accounts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ngn integer NOT NULL,
  direction text NOT NULL CHECK (direction IN ('credit','debit')),
  reason text NOT NULL,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_tx_own_read" ON public.wallet_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX wallet_tx_user_idx ON public.wallet_transactions(user_id);

-- ============ REFERRALS ============
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  reward_ngn integer NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_own_read" ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());
CREATE POLICY "ref_own_create" ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (referrer_id = auth.uid());
CREATE INDEX ref_referrer_idx ON public.referrals(referrer_id);

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.current_plan_code(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT plan_code FROM public.subscriptions
       WHERE user_id = _user_id
         AND status IN ('trialing','active')
         AND (current_period_end IS NULL OR current_period_end > now())
       ORDER BY updated_at DESC LIMIT 1),
    'free'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid, _min_plan text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = _user_id
      AND s.status IN ('trialing','active')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
      AND (_min_plan IS NULL OR s.plan_code = _min_plan)
  );
$$;

CREATE OR REPLACE FUNCTION public.claim_referral(_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _ref public.referrals%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;
  SELECT * INTO _ref FROM public.referrals WHERE code = _code AND referred_user_id IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF _ref.referrer_id = _uid THEN RETURN false; END IF;
  UPDATE public.referrals SET referred_user_id = _uid, redeemed_at = now() WHERE id = _ref.id;
  -- credit both wallets
  INSERT INTO public.wallet_accounts(user_id, balance_ngn) VALUES (_ref.referrer_id, _ref.reward_ngn)
    ON CONFLICT (user_id) DO UPDATE SET balance_ngn = wallet_accounts.balance_ngn + EXCLUDED.balance_ngn;
  INSERT INTO public.wallet_accounts(user_id, balance_ngn) VALUES (_uid, _ref.reward_ngn)
    ON CONFLICT (user_id) DO UPDATE SET balance_ngn = wallet_accounts.balance_ngn + EXCLUDED.balance_ngn;
  INSERT INTO public.wallet_transactions(user_id, amount_ngn, direction, reason, reference)
    VALUES (_ref.referrer_id, _ref.reward_ngn, 'credit', 'referral_reward', _ref.code),
           (_uid, _ref.reward_ngn, 'credit', 'referral_signup', _ref.code);
  RETURN true;
END $$;
