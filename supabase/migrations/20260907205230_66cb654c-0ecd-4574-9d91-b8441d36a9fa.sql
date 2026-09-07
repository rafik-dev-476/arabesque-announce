
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_team(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_ownership() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ownership() TO authenticated;

ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS buttons jsonb NOT NULL DEFAULT '[]'::jsonb;
