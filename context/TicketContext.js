// TicketContext.js — Manages purchased tickets & passes using Supabase bookings

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getBookings, createBooking } from '../services/supabaseService';

const TicketContext = createContext(null);

export const TicketProvider = ({ children }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadTickets();
    } else {
      setTickets([]);
    }
  }, [user]);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const { tickets: fetchedTickets, error } = await getBookings(user.id);
      if (!error) {
        setTickets(fetchedTickets);
      } else {
        console.log('Booking load error:', error);
        setTickets([]);
      }
    } catch (error) {
      console.log('Booking load error:', error);
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addTicket = async ({ ticket, tripId, payment }) => {
    if (!user?.id) {
      return { success: false, error: 'No logged-in user' };
    }

    try {
      const { booking, error } = await createBooking({ passengerId: user.id, tripId, payment });
      if (error || !booking) {
        return { success: false, error: error?.message || 'Unable to create booking' };
      }

      const newTicket = {
        ...ticket,
        id: booking.id,
        status: ticket.status || 'active',
        tripId: booking.trip_id,
        payment: booking.payments?.[0] || null,
      };

      setTickets((prev) => [newTicket, ...prev]);
      return { success: true, ticket: newTicket };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <TicketContext.Provider value={{ tickets, addTicket, isLoading, loadTickets }}>
      {children}
    </TicketContext.Provider>
  );
};

export const useTickets = () => {
  const context = useContext(TicketContext);
  if (!context) throw new Error('useTickets must be used within TicketProvider');
  return context;
};

export default TicketContext;
