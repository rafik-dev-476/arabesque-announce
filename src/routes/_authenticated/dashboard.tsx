import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge, Card, SectionTitle } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { botHealth } from "@/lib/bot.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "نظرة عامة — لوحة بوت ديسكورد" },
      { name: "description", content: "ملخص الإعلانات والتذاكر وحالة البوت." },
      { property: "og:title", content: "نظرة عامة — لوحة بوت ديسكورد" },
      { property: "og:description", content: "ملخص الإعلانات والتذاكر وحالة البوت." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const health = useServerFn(botHealth);

  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const [ann, panels, open, closed] = await Promise.all([
        supabase.from("announcements").select("id", { count: "exact", head: true }),
        supabase.from("ticket_panels").select("id", { count: "exact", head: true }),
        supabase.from("tickets").select("id", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("status", "closed"),
      ]);
      return {
        announcements: ann.count ?? 0,
        panels: panels.count ?? 0,
        open: open.count ?? 0,
        closed: closed.count ?? 0,
      };
    },
  });

  const bot = useQuery({ queryKey: ["bot-health"], queryFn: () => health({}) });

  const cards = [
    { label: "الإعلانات المحفوظة", value: stats.data?.announcements ?? 0, to: "/announcements" },
    { label: "لوحات التذاكر", value: stats.data?.panels ?? 0, to: "/tickets" },
    { label: "تذاكر مفتوحة", value: stats.data?.open ?? 0, to: "/tickets" },
    { label: "تذاكر مغلقة", value: stats.data?.closed ?? 0, to: "/tickets" },
  ] as const;

  return (
    <DashboardLayout title="نظرة عامة" description="ملخص سريع لحالة البوت والمحتوى المحفوظ.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="transition hover:border-primary">
              <div className="text-3xl font-black text-foreground">{c.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{c.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <SectionTitle title="حالة الاتصال بديسكورد" hint="تُقرأ من متغيرات البيئة على الاستضافة." />
        <div className="flex flex-wrap gap-3">
          <Badge tone={bot.data?.hasApp ? "success" : "danger"}>
            معرّف التطبيق {bot.data?.hasApp ? "مضبوط" : "مفقود"}
          </Badge>
          <Badge tone={bot.data?.hasKey ? "success" : "danger"}>
            المفتاح العام {bot.data?.hasKey ? "مضبوط" : "مفقود"}
          </Badge>
          <Badge tone={bot.data?.hasToken ? "success" : "warn"}>
            رمز البوت {bot.data?.hasToken ? "مضبوط" : "غير مضبوط"}
          </Badge>
          {bot.data?.username ? <Badge tone="success">متصل باسم {bot.data.username}</Badge> : null}
          {bot.data?.error ? <Badge tone="danger">{bot.data.error}</Badge> : null}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          إن لم يكن رمز البوت مضبوطاً، افتح{" "}
          <Link to="/setup" className="text-primary underline">
            دليل التشغيل
          </Link>{" "}
          واتبع خطوات ضبط متغيرات البيئة على استضافتك.
        </p>
      </Card>
    </DashboardLayout>
  );
}
