-- Referral credit function
CREATE OR REPLACE FUNCTION add_referral_credit(referrer_id UUID, amount INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET credit_balance = COALESCE(credit_balance, 0) + amount WHERE id = referrer_id;
END;
$$;
