-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_users (
  user_id uuid NOT NULL,
  CONSTRAINT admin_users_pkey PRIMARY KEY (user_id),
  CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  passenger_id uuid NOT NULL,
  trip_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_passenger_id_fkey FOREIGN KEY (passenger_id) REFERENCES public.profiles(id),
  CONSTRAINT bookings_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id)
);
CREATE TABLE public.otp_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '00:10:00'::interval),
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT otp_codes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid,
  passenger_id uuid,
  amount numeric NOT NULL,
  currency text DEFAULT 'INR'::text,
  razorpay_order_id text UNIQUE,
  razorpay_payment_id text UNIQUE,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT payments_passenger_id_fkey FOREIGN KEY (passenger_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  name text,
  phone text,
  role USER-DEFINED NOT NULL DEFAULT 'passenger'::user_role,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  email text UNIQUE,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.route_stops (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL,
  stop_id uuid NOT NULL,
  stop_order integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT route_stops_pkey PRIMARY KEY (id),
  CONSTRAINT route_stops_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id),
  CONSTRAINT route_stops_stop_id_fkey FOREIGN KEY (stop_id) REFERENCES public.stops(id)
);
CREATE TABLE public.routes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  route_name text NOT NULL,
  start_location text NOT NULL,
  end_location text NOT NULL,
  distance_km numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  route_type USER-DEFINED NOT NULL DEFAULT 'General'::route_type,
  CONSTRAINT routes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  refresh_token text NOT NULL UNIQUE,
  device_info text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.stops (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stop_name text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stops_pkey PRIMARY KEY (id)
);
CREATE TABLE public.trips (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL,
  route_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  status USER-DEFINED NOT NULL DEFAULT 'scheduled'::trip_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT trips_pkey PRIMARY KEY (id),
  CONSTRAINT trips_bus_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id),
  CONSTRAINT trips_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id),
  CONSTRAINT trips_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.vehicle_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  speed numeric,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_locations_pkey PRIMARY KEY (id),
  CONSTRAINT bus_locations_bus_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id)
);
CREATE TABLE public.vehicles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vehicle_number text NOT NULL UNIQUE,
  capacity integer NOT NULL CHECK (capacity > 0),
  driver_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  vehicle_type USER-DEFINED NOT NULL DEFAULT 'bus'::vehicle_type,
  CONSTRAINT vehicles_pkey PRIMARY KEY (id),
  CONSTRAINT buses_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(id)
);