import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/DashboardLayout";
import { DiscordPreview } from "@/components/DiscordPreview";
import { Badge, Button, Card, Field, SectionTitle, TextArea, TextInput } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { publishTicketPanel } from "@/lib/bot.functions";
import { newId, type TicketTopic } from "@/lib/announcement-types";

export const Route = createFileRoute("/_authenticated/tickets")({
  head: () => ({
    meta: [
      { title: "التذاكر — لوحة بوت ديسكورد" },
      { name: "description", content: "لوحات التذاكر والتصنيفات ومتابعة التذاكر ونسخ المحادثات." },
      { property: "og:title", content: "التذاكر — لوحة بوت ديسكورد" },
      { property: "og:description", content: "لوحات التذاكر والتصنيفات ومتابعة التذاكر ونسخ المحادثات." },
    ],
  }),
  component: TicketsPage,
});

type Panel = {
  id?: string;
  name: string;
  title: string;
  description: string;
  banner_url: string | null;
  color: string;
  button_label: string;
  button_emoji: string | null;
  topics: TicketTopic[];
  welcome_text: string;
  terms_text: string;
  staff_role_id: string | null;
  category_id: string | null;
};

const EMPTY: Panel = {
  name: "لوحة الدعم",
  title: "مركز الدعم",
  description: "اضغط الزر بالأسفل لفتح تذكرة وسيتواصل معك فريق الدعم.",
  banner_url: null,
  color: "#5865F2",
  button_label: "فتح تذكرة",
  button_emoji: "🎫",
  topics: [
    { id: newId(), label: "دعم عام", description: "استفسارات عامة", emoji: "💬" },
    { id: newId(), label: "شكوى", description: "الإبلاغ عن مشكلة", emoji: "⚠️" },
  ],
  welcome_text: "أهلاً بك! اشرح طلبك بالتفصيل.",
  terms_text: "• لا ترسل معلومات حسابك.\n• الرد خلال ٢٤ ساعة.",
  staff_role_id: null,
  category_id: null,
};

function TicketsPage() {
  const qc = useQueryClient();
  const publish = useServerFn(publishTicketPanel);
  const [panel, setPanel] = useState<Panel>(EMPTY);
  const [channelId, setChannelId] = useState("");
  const [openTranscript, setOpenTranscript] = useState<string | null>(null);

  const panels = useQuery({
    queryKey: ["panels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ticket_panels").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const tickets = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tickets").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...panel, topics: panel.topics as never };
      if (panel.id) {
        const { error } = await supabase.from("ticket_panels").update(payload).eq("id", panel.id);
        if (error) throw error;
        return panel.id;
      }
      const { data, error } = await supabase.from("ticket_panels").insert(payload).select().single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      setPanel((p) => ({ ...p, id }));
      qc.invalidateQueries({ queryKey: ["panels"] });
      toast.success("تم حفظ اللوحة");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!panel.id) throw new Error("احفظ اللوحة أولاً.");
      return publish({ data: { id: panel.id, channelId } });
    },
    onSuccess: (r) => toast.success(`تم نشر اللوحة في القناة ${r.channelId}`),
    onError: (e) => toast.error((e as Error).message),
  });

  function updateTopic(id: string, patch: Partial<TicketTopic>) {
    setPanel((p) => ({ ...p, topics: p.topics.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  }

  return (
    <DashboardLayout title="التذاكر" description="أنشئ لوحات التذاكر وتابع التذاكر ونسخ المحادثات.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="لوحة التذاكر" />
          <div className="space-y-4">
            <Field label="اسم اللوحة" hint="يظهر في قائمة أمر /ticket">
              <TextInput value={panel.name} onChange={(e) => setPanel({ ...panel, name: e.target.value })} />
            </Field>
            <Field label="العنوان">
              <TextInput value={panel.title} onChange={(e) => setPanel({ ...panel, title: e.target.value })} />
            </Field>
            <Field label="الوصف">
              <TextArea value={panel.description} onChange={(e) => setPanel({ ...panel, description: e.target.value })} />
            </Field>
            <Field label="رابط البانر">
              <TextInput
                value={panel.banner_url ?? ""}
                onChange={(e) => setPanel({ ...panel, banner_url: e.target.value })}
                placeholder="https://..."
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="نص الزر">
                <TextInput value={panel.button_label} onChange={(e) => setPanel({ ...panel, button_label: e.target.value })} />
              </Field>
              <Field label="إيموجي الزر">
                <TextInput value={panel.button_emoji ?? ""} onChange={(e) => setPanel({ ...panel, button_emoji: e.target.value })} />
              </Field>
              <Field label="اللون">
                <input
                  type="color"
                  value={panel.color}
                  onChange={(e) => setPanel({ ...panel, color: e.target.value })}
                  className="h-10 w-full cursor-pointer rounded-xl border border-input bg-secondary"
                />
              </Field>
            </div>
            <Field label="نص الترحيب داخل التذكرة">
              <TextArea value={panel.welcome_text} onChange={(e) => setPanel({ ...panel, welcome_text: e.target.value })} />
            </Field>
            <Field label="نص الشروط">
              <TextArea value={panel.terms_text} onChange={(e) => setPanel({ ...panel, terms_text: e.target.value })} />
            </Field>

            <div>
              <span className="mb-2 block text-sm font-medium">التصنيفات</span>
              <div className="space-y-2">
                {panel.topics.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2">
                    <TextInput
                      className="w-28"
                      value={t.emoji ?? ""}
                      onChange={(e) => updateTopic(t.id, { emoji: e.target.value })}
                      placeholder="إيموجي"
                    />
                    <TextInput
                      className="w-40"
                      value={t.label}
                      onChange={(e) => updateTopic(t.id, { label: e.target.value })}
                      placeholder="الاسم"
                    />
                    <TextInput
                      className="min-w-40 flex-1"
                      value={t.description ?? ""}
                      onChange={(e) => updateTopic(t.id, { description: e.target.value })}
                      placeholder="الوصف"
                    />
                    <Button
                      variant="ghost"
                      onClick={() => setPanel((p) => ({ ...p, topics: p.topics.filter((x) => x.id !== t.id) }))}
                    >
                      حذف
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => setPanel((p) => ({ ...p, topics: [...p.topics, { id: newId(), label: "تصنيف" }] }))}
                >
                  + إضافة تصنيف
                </Button>
              </div>
            </div>

            <Field label="معرّف القناة لنشر اللوحة">
              <TextInput value={channelId} onChange={(e) => setChannelId(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                حفظ اللوحة
              </Button>
              <Button variant="outline" onClick={() => send.mutate()} disabled={send.isPending}>
                نشر اللوحة
              </Button>
              <Button variant="ghost" onClick={() => setPanel(EMPTY)}>
                لوحة جديدة
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <SectionTitle title="معاينة اللوحة" />
            <DiscordPreview
              data={{
                title: panel.title,
                body: panel.description,
                image_url: panel.banner_url,
                color: panel.color,
                buttons: [
                  { id: "p", label: panel.button_label, emoji: panel.button_emoji ?? undefined, style: "primary", action: "ticket" },
                ],
              }}
            />
          </Card>

          <Card>
            <SectionTitle title="اللوحات المحفوظة" />
            <div className="space-y-2">
              {(panels.data ?? []).map((p) => (
                <button
                  key={p.id}
                  className="block w-full rounded-xl border border-border px-3 py-2 text-right text-sm hover:border-primary"
                  onClick={() => setPanel({ ...(p as unknown as Panel), topics: (p.topics ?? []) as unknown as TicketTopic[] })}
                >
                  {p.name}
                </button>
              ))}
              {panels.data?.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد لوحات بعد.</p> : null}
            </div>
          </Card>

          <Card>
            <SectionTitle title="آخر التذاكر" />
            <div className="space-y-2">
              {(tickets.data ?? []).map((t) => (
                <div key={t.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">#{t.number}</span>
                    <span className="text-sm text-muted-foreground">{t.opener_username ?? "—"}</span>
                    <Badge tone={t.status === "closed" ? "danger" : t.status === "claimed" ? "warn" : "success"}>
                      {t.status === "closed" ? "مغلقة" : t.status === "claimed" ? "مستلمة" : "مفتوحة"}
                    </Badge>
                    {t.topic ? <Badge>{t.topic}</Badge> : null}
                    {t.transcript ? (
                      <Button variant="ghost" onClick={() => setOpenTranscript(openTranscript === t.id ? null : t.id)}>
                        نسخة المحادثة
                      </Button>
                    ) : null}
                  </div>
                  {openTranscript === t.id ? (
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
                      {t.transcript}
                    </pre>
                  ) : null}
                </div>
              ))}
              {tickets.data?.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد تذاكر بعد.</p> : null}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
