import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Button, Card, Field, SectionTitle, TextArea, TextInput } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { syncSlashCommands } from "@/lib/bot.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — لوحة بوت ديسكورد" },
      { name: "description", content: "إعدادات السيرفر ورتبة الطاقم ونصوص الترحيب والشروط." },
      { property: "og:title", content: "الإعدادات — لوحة بوت ديسكورد" },
      { property: "og:description", content: "إعدادات السيرفر ورتبة الطاقم ونصوص الترحيب والشروط." },
    ],
  }),
  component: SettingsPage,
});

type Settings = {
  id?: string;
  guild_id: string;
  staff_role_id: string;
  ticket_category_id: string;
  transcript_channel_id: string;
  log_channel_id: string;
  welcome_text: string;
  terms_text: string;
};

const EMPTY: Settings = {
  guild_id: "",
  staff_role_id: "",
  ticket_category_id: "",
  transcript_channel_id: "",
  log_channel_id: "",
  welcome_text: "أهلاً بك! فريق الدعم سيرد عليك في أقرب وقت.",
  terms_text: "• احترم أعضاء الفريق.\n• لا ترسل معلومات حسابك الحساسة.\n• التذكرة تُغلق بعد انتهاء الطلب.",
};

function SettingsPage() {
  const qc = useQueryClient();
  const sync = useServerFn(syncSlashCommands);
  const [form, setForm] = useState<Settings>(EMPTY);

  const query = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("guild_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (query.data) {
      setForm({
        id: query.data.id,
        guild_id: query.data.guild_id ?? "",
        staff_role_id: query.data.staff_role_id ?? "",
        ticket_category_id: query.data.ticket_category_id ?? "",
        transcript_channel_id: query.data.transcript_channel_id ?? "",
        log_channel_id: query.data.log_channel_id ?? "",
        welcome_text: query.data.welcome_text ?? "",
        terms_text: query.data.terms_text ?? "",
      });
    }
  }, [query.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (form.id) {
        const { error } = await supabase.from("guild_settings").update(form).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("guild_settings").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("تم حفظ الإعدادات");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const register = useMutation({
    mutationFn: () => sync({ data: { guildId: form.guild_id } }),
    onSuccess: (r) => toast.success(`تم تسجيل الأوامر (${r.scope === "guild" ? "للسيرفر" : "عام"})`),
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <DashboardLayout title="الإعدادات" description="اربط اللوحة بسيرفرك واضبط نصوص التذاكر.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="معرّفات ديسكورد" hint="فعّل وضع المطوّر في ديسكورد لنسخ المعرّفات." />
          <div className="space-y-4">
            <Field label="معرّف السيرفر (Guild ID)">
              <TextInput value={form.guild_id} onChange={(e) => setForm({ ...form, guild_id: e.target.value })} />
            </Field>
            <Field label="رتبة فريق الدعم (Role ID)">
              <TextInput value={form.staff_role_id} onChange={(e) => setForm({ ...form, staff_role_id: e.target.value })} />
            </Field>
            <Field label="تصنيف قنوات التذاكر (Category ID)">
              <TextInput
                value={form.ticket_category_id}
                onChange={(e) => setForm({ ...form, ticket_category_id: e.target.value })}
              />
            </Field>
            <Field label="قناة نسخ المحادثات (Channel ID)">
              <TextInput
                value={form.transcript_channel_id}
                onChange={(e) => setForm({ ...form, transcript_channel_id: e.target.value })}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionTitle title="نصوص التذاكر" hint="تظهر داخل قناة التذكرة عند فتحها." />
          <div className="space-y-4">
            <Field label="نص الترحيب">
              <TextArea value={form.welcome_text} onChange={(e) => setForm({ ...form, welcome_text: e.target.value })} />
            </Field>
            <Field label="نص الشروط">
              <TextArea value={form.terms_text} onChange={(e) => setForm({ ...form, terms_text: e.target.value })} />
            </Field>
          </div>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          حفظ الإعدادات
        </Button>
        <Button variant="outline" onClick={() => register.mutate()} disabled={register.isPending}>
          تسجيل أوامر السلاش
        </Button>
      </div>
    </DashboardLayout>
  );
}
