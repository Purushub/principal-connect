import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SLOTS, todayISO, formatDate } from "@/lib/slots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { CalendarDays, Clock, CheckCircle2, ShieldCheck, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

export const Route = createFileRoute("/")({
  component: BookingPage,
  head: () => ({
    meta: [
      { title: "Book a meeting with the Principal" },
      { name: "description", content: "Reserve a 20-minute meeting slot with the Principal between 9:00 AM and 10:40 AM." },
    ],
  }),
});

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  email: z.string().trim().email("Invalid email").max(150),
  phone: z.string().trim().min(6, "Phone is required").max(20),
  purpose: z.string().trim().min(5, "Purpose is required").max(500),
});

function BookingPage() {
  const date = todayISO();
  const [booked, setBooked] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ slot: number; name: string } | null>(null);

  const fetchBooked = async () => {
    const { data, error } = await supabase.rpc("get_booked_slots", { _date: date });
    if (error) {
      toast.error("Could not load slots");
    } else {
      setBooked(new Set((data ?? []).map((r: { slot_index: number }) => r.slot_index)));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBooked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (activeSlot === null) return;
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: fd.get("name"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      purpose: fd.get("purpose"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("bookings").insert({
      booking_date: date,
      slot_index: activeSlot,
      ...parsed.data,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("That slot was just taken. Please choose another.");
      } else {
        toast.error("Could not book. Please try again.");
      }
      await fetchBooked();
      setActiveSlot(null);
      return;
    }
    setConfirmed({ slot: activeSlot, name: parsed.data.name });
    setActiveSlot(null);
    await fetchBooked();
  };

  const heroStyle = useMemo(() => ({ background: "var(--gradient-hero)" }), []);

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <CalendarDays className="h-5 w-5 text-brand" />
            Principal Meetings
          </div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ShieldCheck className="h-4 w-4" /> Principal login
          </Link>
        </div>
      </header>

      <section style={heroStyle} className="text-brand-foreground">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Book a 20-minute meeting with the Principal
          </h1>
          <p className="mt-3 text-base md:text-lg opacity-90">
            {formatDate(date)} · 9:00 AM – 10:40 AM
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-slot-available" /> Available
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-slot-booked" /> Booked
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SLOTS.map((s) => {
            const isBooked = booked.has(s.index);
            return (
              <button
                key={s.index}
                disabled={isBooked || loading}
                onClick={() => setActiveSlot(s.index)}
                className={`group rounded-xl border p-5 text-left transition-all ${
                  isBooked
                    ? "bg-slot-booked text-slot-booked-foreground cursor-not-allowed opacity-80"
                    : "bg-card hover:border-brand hover:shadow-[var(--shadow-card)] hover:-translate-y-0.5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    {s.label}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      isBooked
                        ? "bg-slot-booked-foreground/10"
                        : "bg-slot-available text-slot-available-foreground"
                    }`}
                  >
                    {isBooked ? "Booked" : "Available"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {isBooked ? "This slot is reserved." : "Tap to reserve this slot."}
                </p>
              </button>
            );
          })}
        </div>
      </main>

      <Dialog open={activeSlot !== null} onOpenChange={(o) => !o && setActiveSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reserve your slot</DialogTitle>
            <DialogDescription>
              {activeSlot !== null && SLOTS[activeSlot].label} · {formatDate(date)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" required maxLength={80} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required maxLength={150} />
            </div>
            <div>
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" name="phone" type="tel" required maxLength={20} />
            </div>
            <div>
              <Label htmlFor="purpose">Purpose of meeting</Label>
              <Textarea id="purpose" name="purpose" required maxLength={500} rows={3} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Booking…" : "Confirm booking"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmed} onOpenChange={(o) => !o && setConfirmed(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-slot-available" /> Booking confirmed
            </DialogTitle>
            <DialogDescription>
              {confirmed && (
                <>
                  Thanks, {confirmed.name}! Your meeting is reserved for{" "}
                  <strong>{SLOTS[confirmed.slot].label}</strong> on {formatDate(date)}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setConfirmed(null)} className="w-full">Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
