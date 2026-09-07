import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button, Card, Field, TextInput } from "@/components/ui-kit";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — لوحة بوت ديسكورد" },
      { name: "description", content: "دخول مالك اللوحة لإدارة الإعلانات والتذاكر." },
      { property: "og:title", content: "تسجيل الدخول — لوحة بوت ديسكورد" },
      { property: "og:description", content: "دخول مالك اللوحة لإدارة الإعلانات والتذاكر." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await supabase.rpc("claim_ownership");
      toast.success("تم تسجيل الدخول");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-xl font-black text-foreground">
          {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب المالك"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          أول حساب يُسجّل يصبح مالك اللوحة تلقائياً.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="البريد الإلكتروني">
            <TextInput
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@example.com"
            />
          </Field>
          <Field label="كلمة المرور">
            <TextInput
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "جارٍ..." : mode === "signin" ? "دخول" : "إنشاء الحساب والدخول"}
          </Button>
        </form>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "ليس لديك حساب؟ أنشئ حساب المالك" : "لدي حساب بالفعل"}
        </button>
        <Link to="/" className="mt-3 block text-center text-xs text-muted-foreground hover:text-foreground">
          العودة للرئيسية
        </Link>
      </Card>
    </div>
  );
}
