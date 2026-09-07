import { createFileRoute, Link } from "@tanstack/react-router";

import { DISCORD_APPLICATION_ID } from "@/lib/discord-config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "بوت الإعلانات والتذاكر لديسكورد" },
      {
        name: "description",
        content:
          "لوحة تحكم عربية لإنشاء إعلانات ديسكورد بأزرار تفاعلية، ونظام تذاكر متكامل مع أوامر /announce و /ticket و /serverinfo.",
      },
      { property: "og:title", content: "بوت الإعلانات والتذاكر لديسكورد" },
      {
        property: "og:description",
        content: "أنشئ إعلانات وأزرار تفاعلية ونظام تذاكر لسيرفرك من لوحة عربية واحدة.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { title: "إعلانات بشكل بطاقة", text: "عنوان، نص، بانر، لون، وتذييل — مع معاينة مطابقة لديسكورد." },
  { title: "أزرار تفاعلية", text: "أزرار متعددة: فتح تذكرة، عرض معلومة، رابط خارجي، أو رد تأكيد." },
  { title: "نظام تذاكر كامل", text: "لوحات تذاكر بتصنيفات، قنوات خاصة، استلام وإغلاق ونسخة محادثة." },
  { title: "أوامر سلاش", text: "/announce و /ticket و /serverinfo مع اختيار القناة المستهدفة." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-20">
        <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
          معرّف التطبيق: {DISCORD_APPLICATION_ID}
        </span>
        <h1 className="mt-6 text-4xl font-black leading-tight text-foreground sm:text-5xl">
          لوحة تحكم عربية لبوت إعلانات وتذاكر ديسكورد
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          صمّم الإعلان، أضف أزراراً تفاعلية، عاينه كما يظهر في ديسكورد تماماً، ثم انشره بأمر
          سلاش في القناة التي تختارها.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/auth"
            className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            دخول لوحة التحكم
          </Link>
          <Link
            to="/setup"
            className="rounded-xl border border-border px-5 py-3 font-semibold text-foreground transition hover:bg-secondary"
          >
            دليل الربط والتشغيل
          </Link>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-bold text-foreground">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
