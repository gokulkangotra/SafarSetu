const { supabase } = require('./services/supabaseClient.js');

console.log('Testing Supabase client...');
console.log('Client initialized:', !!supabase);
console.log('Auth available:', !!supabase.auth);
console.log('Auth methods:', Object.keys(supabase.auth).filter(k => typeof supabase.auth[k] === 'function').slice(0, 10));

(async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('Session check result:', { hasSession: !!data.session, error: error?.message });
  } catch (err) {
    console.log('Session check error:', err.message);
  }
})();