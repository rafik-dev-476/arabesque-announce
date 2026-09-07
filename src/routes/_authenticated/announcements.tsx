import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/DashboardLayout";
import { DiscordPreview } from "@/components/DiscordPreview";
import { Badge, Button, Card, Field, SectionTitle, Select, TextArea, TextInput } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { publishAnnouncement } from "@/lib/bot.functions";
import {
  ACTION_META,
  BUTTON_STYLE_META,
  newId,
  type AnnouncementDraft,
  type ButtonAction,
  type ButtonStyle,
  type EmbedButton,
} from "@/lib/announcement-types";

export const Route = createFileRoute("/_authenticated/announcements")({
  head: () => ({
    meta: [
      { title: "الإعلانات — لوحة بوت ديسكورد" },
      { name: "description", content: "إنشاء إعلانات ديسكورد بأزرار تفاعلية ومعاينة مباشرة." },
      { property: "og:title", content: "الإعلانات — لوحة بوت ديسكورد" },
      { property: "og:description", content: "إنشاء إعلانات ديسكورد بأزرار تفاعلية ومعاينة مباشرة." },
    ],
  }),
  component: AnnouncementsPage,
});

const EMPTY: AnnouncementDraft = {
  name: "إعلان جديد",
  title: "عنوان الإعلان",
  body: "اكتب نص الإعلان هنا.",
  image_url: null,
  thumbnail_url: null,
  color: "#5865F2",
  button_label: null,
  button_url: null,
  footer_text: null,
  default_channel_id: null,
  buttons: [],
};

function AnnouncementsPage() {
  const qc = useQueryClient();
  const publish = useServerFn(publishAnnouncement);
  const [draft, setDraft] = useState<AnnouncementDraft>(EMPTY);
  const [channelId, setChannelId] = useState("");
  const [uploading, setUploading] = useState(false);

  const list = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...draft, buttons: draft.buttons as never };
      if (draft.id) {
        const { error } = await supabase.from("announcements").update(payload).eq("id", draft.id);
        if (error) throw error;
        return draft.id;
      }
      const { data, error } = await supabase.from("announcements").insert(payload).select().single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      setDraft((d) => ({ ...d, id }));
      qc.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("تم حفظ الإعلان");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft(EMPTY);
      qc.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("تم الحذف");
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!draft.id) throw new Error("احفظ الإعلان أولاً.");
      return publish({ data: { id: draft.id, channelId: channelId || draft.default_channel_id || "" } });
    },
    onSuccess: (r) => toast.success(`تم النشر في القناة ${r.channelId}`),
    onError: (e) => toast.error((e as Error).message),
  });

  async function uploadImage(file: File, key: "image_url" | "thumbnail_url") {
    setUploading(true);
    try {
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "")}`;
      const { error } = await supabase.storage.from("announcement-media").upload(path, file);
      if (error) throw error;
      const { data, error: signErr } = await supabase.storage
        .from("announcement-media")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signErr) throw signErr;
      setDraft((d) => ({ ...d, [key]: data.signedUrl }));
      toast.success("تم رفع الصورة");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function updateButton(id: string, patch: Partial<EmbedButton>) {
    setDraft((d) => ({
      ...d,
      buttons: d.buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  }

  return (
    <DashboardLayout
      title="الإعلانات"
      description="صمّم بطاقة الإعلان وأزرارها، ثم انشرها عبر اللوحة أو أمر /announce."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <Card>
            <SectionTitle title="محتوى الإعلان" />
            <div className="space-y-4">
              <Field label="اسم القالب" hint="يظهر في قائمة أمر /announce">
                <TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </Field>
              <Field label="العنوان">
                <TextInput value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </Field>
              <Field label="النص">
                <TextArea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="لون البطاقة">
                  <input
                    type="color"
                    value={draft.color}
                    onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                    className="h-10 w-full cursor-pointer rounded-xl border border-input bg-secondary"
                  />
                </Field>
                <Field label="نص التذييل">
                  <TextInput
                    value={draft.footer_text ?? ""}
                    onChange={(e) => setDraft({ ...draft, footer_text: e.target.value })}
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="البانر (صورة كبيرة)">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "image_url")}
                    className="w-full text-sm text-muted-foreground"
                  />
                </Field>
                <Field label="صورة مصغّرة">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "thumbnail_url")}
                    className="w-full text-sm text-muted-foreground"
                  />
                </Field>
              </div>
              <Field label="معرّف القناة الافتراضية" hint="اختياري — يمكن تجاوزه من أمر /announce">
                <TextInput
                  value={draft.default_channel_id ?? ""}
                  onChange={(e) => setDraft({ ...draft, default_channel_id: e.target.value })}
                  placeholder="123456789012345678"
                />
              </Field>
            </div>
          </Card>

          <Card>
            <SectionTitle title="الأزرار التفاعلية" hint="أضف أزراراً متعددة واختر إجراء كل زر." />
            <div className="space-y-4">
              {draft.buttons.map((b) => (
                <div key={b.id} className="rounded-xl border border-border p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="نص الزر">
                      <TextInput value={b.label} onChange={(e) => updateButton(b.id, { label: e.target.value })} />
                    </Field>
                    <Field label="إيموجي">
                      <TextInput
                        value={b.emoji ?? ""}
                        onChange={(e) => updateButton(b.id, { emoji: e.target.value })}
                        placeholder="🎫"
                      />
                    </Field>
                    <Field label="الإجراء">
                      <Select
                        value={b.action}
                        onChange={(e) => updateButton(b.id, { action: e.target.value as ButtonAction })}
                      >
                        {Object.entries(ACTION_META).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="اللون">
                      <Select
                        value={b.style}
                        disabled={b.action === "url"}
                        onChange={(e) => updateButton(b.id, { style: e.target.value as ButtonStyle })}
                      >
                        {Object.entries(BUTTON_STYLE_META)
                          .filter(([k]) => k !== "link")
                          .map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.label}
                            </option>
                          ))}
                      </Select>
                    </Field>
                  </div>

                  {b.action === "url" ? (
                    <Field label="الرابط">
                      <TextInput value={b.url ?? ""} onChange={(e) => updateButton(b.id, { url: e.target.value })} />
                    </Field>
                  ) : null}
                  {b.action === "ticket" ? (
                    <Field label="نوع التذكرة (اختياري)" hint="اترك الحقل فارغاً ليختار العضو التصنيف بنفسه">
                      <TextInput value={b.topic ?? ""} onChange={(e) => updateButton(b.id, { topic: e.target.value })} />
                    </Field>
                  ) : null}
                  {b.action === "info" || b.action === "ack" ? (
                    <div className="space-y-3">
                      {b.action === "info" ? (
                        <Field label="عنوان الرد">
                          <TextInput
                            value={b.responseTitle ?? ""}
                            onChange={(e) => updateButton(b.id, { responseTitle: e.target.value })}
                          />
                        </Field>
                      ) : null}
                      <Field label="النص الذي يظهر عند الضغط">
                        <TextArea
                          value={b.responseText ?? ""}
                          onChange={(e) => updateButton(b.id, { responseText: e.target.value })}
                        />
                      </Field>
                    </div>
                  ) : null}

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{ACTION_META[b.action].hint}</span>
                    <Button
                      variant="danger"
                      onClick={() =>
                        setDraft((d) => ({ ...d, buttons: d.buttons.filter((x) => x.id !== b.id) }))
                      }
                    >
                      حذف الزر
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    buttons: [
                      ...d.buttons,
                      { id: newId(), label: "زر جديد", style: "primary", action: "info", ephemeral: true },
                    ],
                  }))
                }
              >
                + إضافة زر
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <SectionTitle title="المعاينة كما تظهر في ديسكورد" />
            <DiscordPreview data={draft} />
          </Card>

          <Card>
            <SectionTitle title="الحفظ والنشر" />
            <Field label="معرّف القناة للنشر الآن" hint="اتركه فارغاً لاستخدام القناة الافتراضية">
              <TextInput value={channelId} onChange={(e) => setChannelId(e.target.value)} />
            </Field>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                حفظ
              </Button>
              <Button variant="outline" onClick={() => send.mutate()} disabled={send.isPending}>
                نشر الآن
              </Button>
              <Button variant="ghost" onClick={() => setDraft(EMPTY)}>
                إعلان جديد
              </Button>
            </div>
          </Card>

          <Card>
            <SectionTitle title="الإعلانات المحفوظة" />
            <div className="space-y-2">
              {(list.data ?? []).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
                >
                  <button
                    className="flex-1 text-right text-sm text-foreground hover:text-primary"
                    onClick={() =>
                      setDraft({
                        ...(a as unknown as AnnouncementDraft),
                        buttons: ((a.buttons ?? []) as unknown as EmbedButton[]) ?? [],
                      })
                    }
                  >
                    {a.name}
                  </button>
                  {a.last_published_at ? <Badge tone="success">نُشر</Badge> : <Badge>مسودة</Badge>}
                  <Button variant="ghost" onClick={() => remove.mutate(a.id)}>
                    حذف
                  </Button>
                </div>
              ))}
              {list.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد إعلانات بعد.</p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
