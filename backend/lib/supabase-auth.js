const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) throw new Error('SUPABASE_URL is required');
if (!publishableKey) throw new Error('SUPABASE_PUBLISHABLE_KEY is required');

const sharedAuthOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};

const supabaseAuth = createClient(supabaseUrl, publishableKey, {
  auth: sharedAuthOptions,
});

const supabaseAdmin = secretKey
  ? createClient(supabaseUrl, secretKey, { auth: sharedAuthOptions })
  : null;

async function verifyAccessToken(token) {
  const { data, error } = await supabaseAuth.auth.getClaims(token);
  const claims = data?.claims;

  if (error || !claims?.sub) {
    const authError = new Error('Invalid or expired access token');
    authError.cause = error;
    throw authError;
  }

  return claims;
}

module.exports = { supabaseAdmin, verifyAccessToken };
