import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SLOTS, todayISO, formatDate } from "@/lib/slots";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CalendarDays, LogOut, Trash2, CheckCircle2, Clock, CircleSlash,
} from "lucide-react";

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
  status: string;
  created_at: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayISO());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [toDelete, setToDelete] = useState<Booking | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("admin_ok") !== "1") {
      navigate({ to: "/admin" });
    } else {
      setAuthed(true);
    }
  }, [navigate]);

  const load = (d: string) => {
    setLoading(true);
    supabase
      .from("bookings")
      .select("*")
      .eq("booking_date", d)
      .order("slot_index")
      .then(({ data, error }) => {
        if (error) toast.error("Could not load bookings");
        setBookings((data ?? []) as Booking[]);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!authed) return;
    load(date);
  }, [date, authed]);

  const confirmBooking = async (b: Booking) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", b.id);
    if (error) return toast.error("Could not confirm");
    toast.success(`Confirmed ${b.name}`);
    setBookings((xs) => xs.map((x) => (x.id === b.id ? { ...x, status: "confirmed" } : x)));
  };

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

  const signOut = () => {
    sessionStorage.removeItem("admin_ok");
    navigate({ to: "/admin" });
  };

  const bySlot = useMemo(() => new Map(bookings.map((b) => [b.slot_index, b])), [bookings]);
  const stats = useMemo(() => {
    const booked = bookings.length;
    const confirmed = bookings.filter((b) => b.status === "confirmed").length;
    return { booked, confirmed, available: SLOTS.length - booked, pending: booked - confirmed };
  }, [bookings]);

  if (!authed) return null;

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

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total slots" value={SLOTS.length} />
          <StatCard label="Booked" value={stats.booked} />
          <StatCard label="Confirmed" value={stats.confirmed} tone="success" />
          <StatCard label="Available" value={stats.available} tone="muted" />
        </div>

        <div className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3 font-medium">All bookings for {formatDate(date)}</div>
          {loading ? (
            <p className="p-6 text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Time slot</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-44 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SLOTS.map((s) => {
                  const b = bySlot.get(s.index);
                  return (
                    <TableRow key={s.index}>
                      <TableCell className="font-medium">{s.label}</TableCell>
                      {b ? (
                        <>
                          <TableCell>{b.name}</TableCell>
                          <TableCell className="text-sm">
                            <div>{b.email}</div>
                            <div className="text-muted-foreground">{b.phone}</div>
                          </TableCell>
                          <TableCell className="max-w-xs text-sm">{b.purpose}</TableCell>
                          <TableCell>
                            {b.status === "confirmed" ? (
                              <Badge className="bg-green-600 hover:bg-green-600">
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Confirmed
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Clock className="mr-1 h-3 w-3" /> Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {b.status !== "confirmed" && (
                                <Button size="sm" onClick={() => confirmBooking(b)}>
                                  <CheckCircle2 className="mr-1 h-4 w-4" /> Confirm
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => setToDelete(b)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell colSpan={4} className="text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <CircleSlash className="h-3.5 w-3.5" /> Available
                            </span>
                          </TableCell>
                          <TableCell />
                        </>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
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

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "muted";
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={
          "mt-1 text-2xl font-semibold " +
          (tone === "success" ? "text-green-600" : tone === "muted" ? "text-muted-foreground" : "")
        }
      >
        {value}
      </div>
    </div>
  );
}
