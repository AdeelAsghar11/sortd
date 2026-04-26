import { supabase } from './database.js';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;
  
  if (authHeader) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    console.log(`🔐 Auth: Verifying token for request to ${req.url}...`);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.warn(`❌ Auth: Invalid token for ${req.url}:`, error?.message || 'No user found');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log(`✅ Auth: User ${user.id} authenticated for ${req.url}`);
    req.user = user;
    next();
  } catch (err) {
    console.error(`💥 Auth: Exception during verification for ${req.url}:`, err.message);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};
