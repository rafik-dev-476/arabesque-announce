CREATE TABLE public.bot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_token text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bot_config TO service_role;
ALTER TABLE public.bot_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.bot_config (bot_token) VALUES (NULL);