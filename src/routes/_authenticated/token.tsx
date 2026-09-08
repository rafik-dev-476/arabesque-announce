import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge, Button, Card, Field, SectionTitle, TextInput } from "@/components/ui-kit";
import { botHealth, clearBotToken, saveBotToken } from "@/lib/bot.functions";
import { DISCORD_APPLICATION_ID } from "@/lib/discord-config";

export const Route = createFileRoute("/_authenticated/token")({
  head: () => ({
    meta: [
      { title: "رمز البوت — لوحة بوت ديسكورد" },
      { name: "description", content: "احفظ رمز بوت ديسكورد لتفعيل النشر من اللوحة ومن أمر السلاش." },
      { property: "og:title", content: "رمز البوت — لوحة بوت ديسكورد" },
      { property: "og:description", content: "احفظ رمز بوت ديسكورد لتفعيل النشر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TokenPage,
});

function TokenPage() {
  const qc = useQueryClient();
  const health = useServerFn(botHealth);
  const save = useServerFn(saveBotToken);
  const clear = useServerFn(clearBotToken);
  const [token, setToken] = useState("");

  const bot = useQuery({ queryKey: ["bot-health"], queryFn: () => health({}) });

  const saveToken = useMutation({
    mutationFn: () => save({ data: { token } }),
    onSuccess: (r) => {
      setToken("");
      qc.invalidateQueries({ queryKey: ["bot-health"] });
      toast.success(`تم الحفظ والاتصال باسم ${r.username} ✅`);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const removeToken = useMutation({
    mutationFn: () => clear({}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bot-health"] });
      toast.success("تم حذف الرمز");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <DashboardLayout
      title="رمز البوت"
      description="ضع رمز بوت ديسكورد هنا مرة واحدة، وبعدها يعمل النشر وأمر /announcement مباشرة."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="حالة البوت" />
          <div className="flex flex-wrap gap-3">
            <Badge tone={bot.data?.hasToken ? "success" : "danger"}>
              رمز البوت {bot.data?.hasToken ? "محفوظ" : "غير محفوظ"}
            </Badge>
            {bot.data?.username ? <Badge tone="success">متصل باسم {bot.data.username}</Badge> : null}
            {bot.data?.error ? <Badge tone="danger">{bot.data.error}</Badge> : null}
          </div>

          <Field label="رمز البوت (Bot Token)" hint="يُحفظ مشفّراً في الخادم ولا يظهر لأحد بعد الحفظ.">
            <TextInput
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="MTM1NTcwMzg1ODU3MTEyMDY1MA..."
              dir="ltr"
            />
          </Field>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => saveToken.mutate()} disabled={saveToken.isPending || !token.trim()}>
              حفظ وتجربة الاتصال
            </Button>
            {bot.data?.hasToken ? (
              <Button variant="danger" onClick={() => removeToken.mutate()} disabled={removeToken.isPending}>
                حذف الرمز
              </Button>
            ) : null}
          </div>
        </Card>

        <Card>
          <SectionTitle title="من أين أجيب الرمز؟" />
          <ol className="space-y-3 text-sm leading-7 text-muted-foreground">
            <li>
              ١. افتح{" "}
              <a
                className="text-primary underline"
                href={`https://discord.com/developers/applications/${DISCORD_APPLICATION_ID}/bot`}
                target="_blank"
                rel="noreferrer"
              >
                صفحة البوت في بوابة مطوّري ديسكورد
              </a>
              .
            </li>
            <li>٢. من قسم Bot اضغط Reset Token ثم Copy لنسخ الرمز.</li>
            <li>٣. ارجع هنا، الصق الرمز في الحقل واضغط «حفظ وتجربة الاتصال».</li>
            <li>٤. إذا ظهر اسم البوت باللون الأخضر فكل شيء جاهز للنشر.</li>
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            لا تشارك هذا الرمز مع أحد. إذا تسرّب، اضغط Reset Token في ديسكورد ثم احفظ الرمز الجديد هنا.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
