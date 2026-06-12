import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SLOTS, todayISO, formatDate } from "@/lib/slots";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarDays, LogOut, Trash2, Mail, Phone, User } from "lucide-react";

export const Route = createFileRoute("/admin/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Principal dashboard" }] }),
});

interface Booking {
  id: string;
  booking_date: string;
  slot_index: number;
  name: string;
  email: string;
  phone: string;
  purpose: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayISO());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<Booking | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("admin_ok") !== "1") {
      navigate({ to: "/admin" });
    }
  }, [navigate]);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("bookings")
      .select("*")
      .eq("booking_date", date)
      .order("slot_index")
      .then(({ data, error }) => {
        if (error) toast.error("Could not load bookings");
        setBookings((data ?? []) as Booking[]);
        setLoading(false);
      });
  }, [date]);


  const cancel = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("bookings").delete().eq("id", toDelete.id);
    if (error) toast.error("Could not cancel");
    else {
      toast.success("Booking cancelled");
      setBookings((b) => b.filter((x) => x.id !== toDelete.id));
    }
    setToDelete(null);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin" });
  };

  const bySlot = new Map(bookings.map((b) => [b.slot_index, b]));

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <CalendarDays className="h-5 w-5 text-brand" /> Principal Dashboard
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
            />
          </div>
          <p className="text-sm text-muted-foreground">{formatDate(date)}</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid gap-3">
            {SLOTS.map((s) => {
              const b = bySlot.get(s.index);
              return (
                <div
                  key={s.index}
                  className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center"
                >
                  <div className="w-full sm:w-40 font-medium">{s.label}</div>
                  {b ? (
                    <>
                      <div className="flex-1 grid gap-1 text-sm sm:grid-cols-2">
                        <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted-foreground" />{b.name}</span>
                        <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{b.email}</span>
                        <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{b.phone}</span>
                        <span className="text-muted-foreground sm:col-span-2"><strong className="text-foreground">Purpose:</strong> {b.purpose}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setToDelete(b)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Cancel
                      </Button>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">— Available —</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will free up the slot. {toDelete?.name} will lose their reservation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={cancel}>Cancel booking</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
