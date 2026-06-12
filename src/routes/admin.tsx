import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminGate,
  head: () => ({ meta: [{ title: "Principal access" }] }),
});

const ADMIN_CODE = "Skillizee@321";

function AdminGate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const code = String(fd.get("code") || "").trim();
    if (!email || !code) {
      toast.error("Enter your email and the access code");
      return;
    }
    setLoading(true);
    if (code !== ADMIN_CODE) {
      toast.error("Incorrect access code");
      setLoading(false);
      return;
    }
    try {
      sessionStorage.setItem("admin_ok", "1");
    } catch {}
    setLoading(false);
    navigate({ to: "/admin/dashboard" });
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
            <h1 className="text-xl font-semibold">Principal access</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your email and the access code to view today's bookings.
            </p>
          </div>
          <form onSubmit={handle} className="space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@school.org" />
            </div>
            <div>
              <Label htmlFor="code">Access code</Label>
              <Input id="code" name="code" type="password" required />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Please wait…" : "Continue"}
            </Button>
          </form>
          <Link to="/" className="mt-4 block text-center text-sm text-brand hover:underline">
            ← Back to booking
          </Link>
        </div>
      </div>
    </div>
  );
}
