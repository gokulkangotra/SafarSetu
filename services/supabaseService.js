import { supabase } from './supabaseClient';

const routeColors = ['#1E3A8A', '#F97316', '#22C55E', '#8B5CF6', '#EC4899', '#0EA5E9', '#F59E0B'];

const translateRoute = (route, index = 0) => {
  const stops = (route.route_stops || [])
    .map((item) => ({
      id: item.stop?.id || item.id,
      name: item.stop?.stop_name || item.stop_name || 'Stop',
      latitude: item.stop?.latitude || item.latitude,
      longitude: item.stop?.longitude || item.longitude,
      order: item.stop_order,
      distanceFromPrevKm: Number(item.distance_from_prev_km) || 0,
      avgTravelTimeMinutes: Number(item.avg_travel_time_minutes) || 0,
    }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const distanceKm = Number(route.distance_km) || 0;
  const defaultFare = Math.max(10, Math.round(distanceKm * 4));
  const defaultPass = Math.max(200, Math.round(defaultFare * 18));
  const computedDuration = Math.round((distanceKm / 25) * 60);

  return {
    id: route.id,
    number: String(route.route_code || index + 1),
    name: route.route_name || 'Unnamed Route',
    source: route.start_location || 'Start',
    destination: route.end_location || 'End',
    color: route.color || routeColors[index % routeColors.length],
    distance: distanceKm ? `${distanceKm} km` : 'N/A',
    duration: route.duration || (distanceKm ? `${computedDuration} min` : '—'),
    fare: {
      normal: Number(route.normal_fare) || defaultFare,
      pass: Number(route.pass_fare) || defaultPass,
    },
    frequency: route.frequency || 'Every 15 min',
    routeType: route.route_type || route.type || 'General',
    stops,
    vehicles: route.vehicles || [],
    createdAt: route.created_at,
  };
};

const mapBooking = (booking) => {
  const trip = booking.trip || null;
  const route = trip?.route || null;
  const vehicle = trip?.vehicle || null;
  const payment = booking.payments?.[0] || null;

  const routeLabel = route?.route_name || route?.id || 'Route';
  const from = route?.start_location || 'Start';
  const to = route?.end_location || 'End';
  const date = booking.created_at ? booking.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
  const time = booking.created_at ? booking.created_at.split('T')[1].slice(0, 5) : new Date().toTimeString().slice(0, 5);
  const computedFare = payment?.amount ?? (Number(route?.distance_km) ? Math.max(15, Math.round(Number(route.distance_km) * 4)) : 0);

  return {
    id: booking.id,
    type: trip?.status === 'completed' ? 'Trip' : 'Ticket',
    route: routeLabel,
    from,
    to,
    date,
    time,
    fare: computedFare,
    status: trip?.status === 'completed' ? 'used' : 'active',
    qrData: `SAFARSETU|${booking.id}|${routeLabel}|${from}|${to}|${date}`,
    tripId: trip?.id,
    vehicleNumber: vehicle?.vehicle_number,
    payment: payment
      ? {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          orderId: payment.razorpay_order_id,
          paymentId: payment.razorpay_payment_id,
          createdAt: payment.created_at,
        }
      : null,
  };
};

export const authSignInWithPassword = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { data: null, error };
  }

  const session = data.session;
  if (!session) {
    return { data: { user: data.user, requiresEmailConfirmation: true }, error: null };
  }

  const profileResult = await fetchOrCreateProfile(session.user.id, { email });
  if (profileResult.error || !profileResult.data) {
    return {
      data: null,
      error: profileResult.error || new Error('Unable to fetch or create user profile'),
    };
  }

  return { data: { session, profile: profileResult.data }, error: null };
};

export const authSignUpWithPassword = async (email, password, name = null) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || '',
      },
    },
  });
  if (error) {
    return { data: null, error };
  }

  // If we have a session, user is already confirmed and logged in
  const session = data.session;
  if (session && session.user?.id) {
    const profileResult = await fetchOrCreateProfile(session.user.id, { name, email });
    if (profileResult.error || !profileResult.data) {
      return {
        data: null,
        error: profileResult.error || new Error('Unable to fetch or create user profile'),
      };
    }

    return { data: { session, profile: profileResult.data }, error: null };
  }

  // If no session but user exists, email confirmation is required
  if (data.user) {
    return {
      data: {
        user: data.user,
        requiresEmailConfirmation: true,
        message: 'Please check your email and click the confirmation link before signing in.',
      },
      error: null,
    };
  }

  return { data: null, error: new Error('Signup failed - no user data returned') };
};

export const authSignInWithOtp = async (email) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });
  return { data, error };
};

export const authVerifyOtp = async (email, token) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  return { data, error };
};

export const authSignInWithGoogle = async (redirectTo) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || 'safarsetu://auth/callback',
      skipBrowserRedirect: true,
    },
  });
  return { data, error };
};

export const supabaseSignOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const fetchOrCreateProfile = async (userId, values = {}) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, phone, email, role, created_at')
    .eq('id', userId)
    .single();

  const noRowFound = !!error && (
    error.status === 406 ||
    error.details?.includes('Result contains no rows') ||
    error.details?.includes('No rows') ||
    error.message?.includes('Result contains no rows') ||
    error.message?.includes('No rows')
  );

  if (error && noRowFound) {
    const insertResponse = await supabase
      .from('profiles')
      .insert({
        id: userId,
        name: values.name || 'Traveller',
        phone: values.phone || null,
        email: values.email || null,
        role: values.role || 'user',
      })
      .select('id, name, phone, email, role, created_at')
      .single();

    return {
      data: insertResponse.data,
      error: insertResponse.error || null,
    };
  }

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
};

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  return { data, error };
};

export const getRoutes = async () => {
  const { data, error } = await supabase
    .from('routes')
    .select(`id, route_name, start_location, end_location, distance_km, route_type, vehicles(id), route_stops(id, stop_order, distance_from_prev_km, avg_travel_time_minutes, stop:stops(id, stop_name, latitude, longitude))`);
  if (error) {
    return { routes: [], error };
  }
  return {
    routes: (data || []).map((route, index) => translateRoute(route, index)),
    error: null,
  };
};

export const getRouteById = async (routeId) => {
  const { data, error } = await supabase
    .from('routes')
    .select(`id, route_name, start_location, end_location, distance_km, route_type, vehicles(id), route_stops(id, stop_order, distance_from_prev_km, avg_travel_time_minutes, stop:stops(id, stop_name, latitude, longitude))`)
    .eq('id', routeId)
    .single();
  if (error) {
    return { route: null, error };
  }
  return { route: translateRoute(data, 0), error: null };
};

export const getRouteTrips = async (routeId) => {
  const { data, error } = await supabase
    .from('trips')
    .select('id, vehicle_id, route_id, driver_id, start_time, end_time, status, vehicle:vehicles(id, vehicle_number, capacity, vehicle_type), route:routes(id, route_name, start_location, end_location, distance_km))')
    .eq('route_id', routeId);
  if (error) {
    return { trips: [], error };
  }
  return { trips: data || [], error: null };
};

export const getLiveVehicleLocations = async () => {
  const { data, error } = await supabase
    .from('vehicle_locations')
    .select('id, vehicle_id, latitude, longitude, speed, recorded_at, vehicle:vehicles(id, vehicle_number, capacity, vehicle_type)')
    .order('recorded_at', { ascending: false });
  if (error) {
    return { vehicles: [], error };
  }

  const latestByVehicle = new Map();
  (data || []).forEach((location) => {
    if (!latestByVehicle.has(location.vehicle_id)) {
      latestByVehicle.set(location.vehicle_id, location);
    }
  });

  const vehicles = Array.from(latestByVehicle.values()).map((location) => ({
    id: location.vehicle_id,
    number: location.vehicle?.vehicle_number || location.vehicle_id,
    capacity: location.vehicle?.capacity || 0,
    vehicleType: location.vehicle?.vehicle_type || 'bus',
    speed: Number(location.speed) || 0,
    location: {
      latitude: Number(location.latitude) || 0,
      longitude: Number(location.longitude) || 0,
    },
    recordedAt: location.recorded_at,
  }));

  return { vehicles, error: null };
};

export const getRouteVehicles = async (routeId) => {
  const tripResult = await supabase
    .from('trips')
    .select('id, vehicle_id, status, start_time, end_time, vehicle:vehicles(id, vehicle_number, capacity, vehicle_type)')
    .eq('route_id', routeId)
    .in('status', ['running', 'scheduled']);

  if (tripResult.error) {
    return { vehicles: [], error: tripResult.error };
  }

  const vehicleIds = [...new Set((tripResult.data || []).map((trip) => trip.vehicle_id).filter(Boolean))];
  if (!vehicleIds.length) {
    return { vehicles: [], error: null };
  }

  const locationResult = await supabase
    .from('vehicle_locations')
    .select('id, vehicle_id, latitude, longitude, speed, recorded_at, vehicle:vehicles(id, vehicle_number, capacity, vehicle_type)')
    .in('vehicle_id', vehicleIds)
    .order('recorded_at', { ascending: false });
  if (locationResult.error) {
    return { vehicles: [], error: locationResult.error };
  }

  const latestByVehicle = new Map();
  (locationResult.data || []).forEach((location) => {
    if (!latestByVehicle.has(location.vehicle_id)) {
      latestByVehicle.set(location.vehicle_id, location);
    }
  });

  const tripMap = new Map((tripResult.data || []).map((trip) => [trip.vehicle_id, trip]));

  const vehicles = Array.from(latestByVehicle.values()).map((location) => {
    const trip = tripMap.get(location.vehicle_id);
    return {
      id: location.vehicle_id,
      number: location.vehicle?.vehicle_number || location.vehicle_id,
      capacity: location.vehicle?.capacity || 0,
      vehicleType: location.vehicle?.vehicle_type || 'bus',
      status: trip?.status || 'active',
      speed: Number(location.speed) || 0,
      location: {
        latitude: Number(location.latitude) || 0,
        longitude: Number(location.longitude) || 0,
      },
      tripId: trip?.id,
    };
  });

  return { vehicles, error: null };
};

export const subscribeToVehicleLocations = (vehicleIds, onUpdate) => {
  if (!vehicleIds || vehicleIds.length === 0) return null;

  return supabase
    .channel('public:vehicle_locations')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'vehicle_locations',
        filter: `vehicle_id=in.(${vehicleIds.join(',')})`,
      },
      (payload) => {
        onUpdate(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'vehicle_locations',
        filter: `vehicle_id=in.(${vehicleIds.join(',')})`,
      },
      (payload) => {
        onUpdate(payload.new);
      }
    )
    .subscribe();
};

export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, phone, email, role, created_at')
    .eq('id', userId)
    .single();
  if (error) {
    return { profile: null, error };
  }
  return { profile: data, error: null };
};

export const getBookings = async (passengerId) => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`id, passenger_id, trip_id, created_at, trip:trips(id, route_id, status, route:routes(id, route_name, start_location, end_location, distance_km), vehicle:vehicles(id, vehicle_number)), payments(id, amount, currency, status, razorpay_order_id, razorpay_payment_id, created_at)`)
    .eq('passenger_id', passengerId)
    .order('created_at', { ascending: false });
  if (error) {
    return { tickets: [], error };
  }
  return {
    tickets: (data || []).map(mapBooking),
    error: null,
  };
};

export const createBooking = async ({ passengerId, tripId, payment = null }) => {
  const { data: bookingData, error: bookingError } = await supabase
    .from('bookings')
    .insert({ passenger_id: passengerId, trip_id: tripId })
    .select('id, passenger_id, trip_id, created_at, trip:trips(id, route_id, status, route:routes(id, route_name, start_location, end_location, distance_km), vehicle:vehicles(id, vehicle_number))')
    .single();

  if (bookingError) {
    return { booking: null, error: bookingError };
  }

  if (payment) {
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingData.id,
        passenger_id: passengerId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
      })
      .select('id, booking_id, passenger_id, amount, currency, status, razorpay_order_id, razorpay_payment_id, created_at')
      .single();

    if (paymentError) {
      await supabase.from('bookings').delete().eq('id', bookingData.id);
      return { booking: null, error: paymentError };
    }

    bookingData.payments = [paymentData];
  }

  return { booking: bookingData, error: null };
};


export const updateProfile = async (userId, changes) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(changes)
    .eq('id', userId)
    .select('id, name, phone, email, role, created_at')
    .single();
  return { profile: data, error };
};
