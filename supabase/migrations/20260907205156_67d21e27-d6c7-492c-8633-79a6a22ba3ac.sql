
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_team(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','staff'));
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- First signed-in user can claim ownership when no owner exists yet.
CREATE OR REPLACE FUNCTION public.claim_ownership()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin') ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_ownership() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Guild settings
CREATE TABLE public.guild_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id text,
  staff_role_id text,
  ticket_category_id text,
  transcript_channel_id text,
  log_channel_id text,
  welcome_text text NOT NULL DEFAULT '',
  terms_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guild_settings TO authenticated;
GRANT ALL ON public.guild_settings TO service_role;
ALTER TABLE public.guild_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages settings" ON public.guild_settings FOR ALL TO authenticated
  USING (public.is_team(auth.uid())) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER guild_settings_updated BEFORE UPDATE ON public.guild_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  image_url text,
  thumbnail_url text,
  color text NOT NULL DEFAULT '#5865F2',
  button_label text,
  button_url text,
  footer_text text,
  default_channel_id text,
  last_published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads announcements" ON public.announcements FOR SELECT TO authenticated USING (public.is_team(auth.uid()));
CREATE POLICY "admin writes announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin updates announcements" ON public.announcements FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin deletes announcements" ON public.announcements FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER announcements_updated BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ticket panels
CREATE TABLE public.ticket_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  banner_url text,
  color text NOT NULL DEFAULT '#5865F2',
  button_label text NOT NULL DEFAULT 'فتح تذكرة',
  button_emoji text,
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  welcome_text text NOT NULL DEFAULT '',
  terms_text text NOT NULL DEFAULT '',
  staff_role_id text,
  category_id text,
  channel_id text,
  message_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_panels TO authenticated;
GRANT ALL ON public.ticket_panels TO service_role;
ALTER TABLE public.ticket_panels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads panels" ON public.ticket_panels FOR SELECT TO authenticated USING (public.is_team(auth.uid()));
CREATE POLICY "admin writes panels" ON public.ticket_panels FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin updates panels" ON public.ticket_panels FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin deletes panels" ON public.ticket_panels FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER ticket_panels_updated BEFORE UPDATE ON public.ticket_panels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tickets
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id uuid REFERENCES public.ticket_panels(id) ON DELETE SET NULL,
  number integer GENERATED BY DEFAULT AS IDENTITY,
  guild_id text,
  channel_id text,
  topic text,
  subject text,
  status text NOT NULL DEFAULT 'open',
  opener_discord_id text,
  opener_username text,
  claimed_by_discord_id text,
  claimed_by_username text,
  claimed_at timestamptz,
  closed_by_username text,
  closed_at timestamptz,
  close_reason text,
  transcript text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads tickets" ON public.tickets FOR SELECT TO authenticated USING (public.is_team(auth.uid()));
CREATE POLICY "team updates tickets" ON public.tickets FOR UPDATE TO authenticated USING (public.is_team(auth.uid())) WITH CHECK (public.is_team(auth.uid()));
CREATE POLICY "admin deletes tickets" ON public.tickets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tickets_updated BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ticket messages (transcript source)
CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_discord_id text,
  author_username text,
  content text NOT NULL DEFAULT '',
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ticket_messages_ticket_idx ON public.ticket_messages(ticket_id, sent_at);
GRANT SELECT ON public.ticket_messages TO authenticated;
GRANT ALL ON public.ticket_messages TO service_role;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads ticket messages" ON public.ticket_messages FOR SELECT TO authenticated USING (public.is_team(auth.uid()));
