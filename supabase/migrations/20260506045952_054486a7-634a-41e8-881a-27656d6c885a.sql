
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Admins can view roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Bookings
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_date date NOT NULL,
  slot_index int NOT NULL CHECK (slot_index BETWEEN 0 AND 4),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  purpose text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_date, slot_index)
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Public can create bookings
CREATE POLICY "Anyone can create a booking" ON public.bookings
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view full booking details (PII)
CREATE POLICY "Admins can view bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete (cancel)
CREATE POLICY "Admins can delete bookings" ON public.bookings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update (reschedule)
CREATE POLICY "Admins can update bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Public function to get only the booked slot indices for a date (no PII)
CREATE OR REPLACE FUNCTION public.get_booked_slots(_date date)
RETURNS TABLE(slot_index int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT slot_index FROM public.bookings WHERE booking_date = _date
$$;

GRANT EXECUTE ON FUNCTION public.get_booked_slots(date) TO anon, authenticated;
