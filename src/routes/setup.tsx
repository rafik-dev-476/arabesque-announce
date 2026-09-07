import { createFileRoute, Link } from "@tanstack/react-router";

import { Card, SectionTitle } from "@/components/ui-kit";
import {
  DISCORD_APPLICATION_ID,
  DISCORD_PUBLIC_KEY,
  DISCORD_INVITE_URL,
  DISCORD_ADMIN_INVITE_URL,
  PERMISSION_LIST,
} from "@/lib/discord-config";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "دليل ربط البوت والتشغيل" },
      {
        name: "description",
        content: "خطوات ربط بوت ديسكورد، الصلاحيات المطلوبة، متغيرات البيئة، والتشغيل على استضافتك.",
      },
      { property: "og:title", content: "دليل ربط البوت والتشغيل" },
      {
        property: "og:description",
        content: "خطوات ربط بوت ديسكورد، الصلاحيات المطلوبة، ومتغيرات البيئة للاستضافة الخارجية.",
      },
    ],
  }),
  component: SetupPage,
});

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-xl bg-secondary p-4 text-left text-xs leading-6 text-foreground" dir="ltr">
      {children}
    </pre>
  );
}

function SetupPage() {
  const envExample = `DISCORD_APPLICATION_ID=${DISCORD_APPLICATION_ID}
DISCORD_PUBLIC_KEY=${DISCORD_PUBLIC_KEY}
DISCORD_BOT_TOKEN=<ضع رمز البوت الخاص بك هنا — لا تشاركه مع أحد>
SUPABASE_URL=<رابط قاعدة البيانات>
SUPABASE_SERVICE_ROLE_KEY=<مفتاح الخدمة>
SUPABASE_PUBLISHABLE_KEY=<المفتاح العام>`;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-12">
        <div>
          <h1 className="text-3xl font-black text-foreground">دليل ربط البوت والتشغيل</h1>
          <p className="mt-2 text-muted-foreground">
            كل ما تحتاجه لربط البوت بسيرفرك وتشغيله على استضافتك الخاصة.
          </p>
          <Link to="/" className="mt-3 inline-block text-sm text-primary underline">
            العودة للرئيسية
          </Link>
        </div>

        <Card>
          <SectionTitle title="١. بيانات التطبيق" hint="قيم عامة يمكن عرضها بأمان." />
          <ul className="space-y-2 text-sm">
            <li>
              <span className="text-muted-foreground">Application ID: </span>
              <span className="font-mono">{DISCORD_APPLICATION_ID}</span>
            </li>
            <li className="break-all">
              <span className="text-muted-foreground">Public Key: </span>
              <span className="font-mono">{DISCORD_PUBLIC_KEY}</span>
            </li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            رمز البوت (Bot Token) قيمة سرّية: لا يُطلب منك هنا ولا يُخزَّن في اللوحة — تضعه أنت
            كمتغيّر بيئة على استضافتك فقط.
          </p>
        </Card>

        <Card>
          <SectionTitle title="٢. دعوة البوت والصلاحيات" />
          <p className="text-sm text-muted-foreground">الطريقة الموصى بها: أقل صلاحيات ممكنة.</p>
          <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
            {PERMISSION_LIST.map((p) => (
              <li key={p.name} className="text-foreground">
                • {p.name} — <span className="text-muted-foreground">{p.ar}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              دعوة البوت بالصلاحيات الموصى بها
            </a>
            <a
              href={DISCORD_ADMIN_INVITE_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground"
            >
              دعوة بصلاحية Administrator (الأسهل)
            </a>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            صلاحية Administrator هي أسرع طريق للتشغيل، لكنها تمنح البوت صلاحيات كاملة على
            السيرفر — استخدمها فقط إن كنت تثق بالإعداد، والأفضل هو القائمة أعلاه.
          </p>
        </Card>

        <Card>
          <SectionTitle title="٣. متغيرات البيئة على استضافتك" />
          <Code>{envExample}</Code>
          <p className="mt-3 text-sm text-muted-foreground">
            بعد نشر التطبيق، ضع هذه القيم في إعدادات المتغيرات لدى مزوّد الاستضافة (Cloudflare
            Workers أو Vercel أو أي مزوّد يدعم Node/Edge)، ثم أعد التشغيل.
          </p>
        </Card>

        <Card>
          <SectionTitle title="٤. ربط نقطة استقبال التفاعلات" />
          <p className="text-sm text-muted-foreground">
            في صفحة تطبيقك على Discord Developer Portal، ضع في خانة
            <span className="font-mono"> Interactions Endpoint URL</span> العنوان التالي:
          </p>
          <Code>{`https://<نطاقك>/api/public/discord/interactions`}</Code>
          <p className="mt-3 text-sm text-muted-foreground">
            يتحقق هذا المسار من توقيع Ed25519 لكل طلب قادم من ديسكورد باستخدام المفتاح العام،
            ويرفض أي طلب غير موقّع. عبره تُعالَج أوامر السلاش وكذلك ضغطات الأزرار: كل زر يحمل
            معرّفاً داخلياً يخبر البوت بالإجراء المطلوب (فتح تذكرة، عرض معلومة، رد تأكيد)، أما
            أزرار الروابط الخارجية فيفتحها ديسكورد مباشرة دون المرور بالخادم. وأزرار التذاكر
            (استلام / نسخة المحادثة / إغلاق) تمرّ بنفس المسار.
          </p>
        </Card>

        <Card>
          <SectionTitle title="٥. تسجيل الأوامر" />
          <p className="text-sm text-muted-foreground">
            من صفحة الإعدادات في اللوحة اضغط «تسجيل أوامر السلاش». ضع معرّف السيرفر ليظهر
            التحديث فوراً، أو اتركه فارغاً للتسجيل العام (قد يستغرق حتى ساعة).
          </p>
          <ul className="mt-3 space-y-1 text-sm text-foreground">
            <li>• <span className="font-mono">/announce</span> — اختيار الإعلان + اختيار القناة المستهدفة.</li>
            <li>• <span className="font-mono">/ticket</span> — نشر لوحة تذاكر في قناة، أو عرض معلومات التذكرة الحالية.</li>
            <li>• <span className="font-mono">/serverinfo</span> — معلومات السيرفر أو عضو محدد.</li>
          </ul>
        </Card>

        <Card>
          <SectionTitle title="٦. إعداد التذاكر" />
          <p className="text-sm text-muted-foreground">
            في صفحة الإعدادات ضع معرّف رتبة فريق الدعم، وتصنيف القنوات الذي تُنشأ داخله قنوات
            التذاكر، وقناة حفظ نسخ المحادثات. تُنشأ كل تذكرة كقناة خاصة يراها صاحبها وفريق
            الدعم فقط، وعند الإغلاق تُقفل القناة وتُحفظ نسخة المحادثة في اللوحة وفي قناة النسخ.
          </p>
        </Card>
      </div>
    </div>
  );
}
