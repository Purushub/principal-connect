import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLogin,
  head: () => ({ meta: [{ title: "Principal login" }] }),
});

function AdminLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin/dashboard" });
    });
  }, [navigate]);

  const handle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    if (!email || password.length < 6) {
      toast.error("Enter a valid email and a password (min 6 chars)");
      return;
    }
    setLoading(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/admin" },
      });
      if (error) {
        toast.error(error.message);
      } else if (data.session) {
        const { data: claimed } = await supabase.rpc("claim_first_admin");
        if (claimed) {
          toast.success("Admin account created.");
          navigate({ to: "/admin/dashboard" });
        } else {
          toast.error("An admin already exists. Contact the existing Principal.");
          await supabase.auth.signOut();
        }
      } else {
        toast.success("Check your email to confirm, then sign in.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        navigate({ to: "/admin/dashboard" });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
        <div className="w-full rounded-2xl border bg-card p-8 shadow-[var(--shadow-card)]">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
              <ShieldCheck className="h-6 w-6 text-brand" />
            </div>
            <h1 className="text-xl font-semibold">Principal {mode === "signup" ? "registration" : "login"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signup" ? "Create the Principal account." : "Sign in to view today's bookings."}
            </p>
          </div>
          <form onSubmit={handle} className="space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={6} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "First-time setup? Create admin account" : "Have an account? Sign in"}
          </button>
          <Link to="/" className="mt-4 block text-center text-sm text-brand hover:underline">
            ← Back to booking
          </Link>
        </div>
      </div>
    </div>
  );
}
