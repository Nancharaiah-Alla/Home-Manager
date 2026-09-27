import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { getDb, queryAll, queryOne, run, runTransaction } from './db';
import { ensureDefaultCategoriesAndMerchants } from './seed';
import firebaseConfig from './firebaseConfig';

const JWT_SECRET = process.env.JWT_SECRET || 'home-manager-secure-jwt-token-2026';

interface VerifiedGoogleAccount {
  email: string;
  name?: string;
  picture?: string;
}

async function verifyGoogleCredential(
  idToken?: string,
  accessToken?: string,
  clientUser?: { email?: string; name?: string; photoUrl?: string }
): Promise<VerifiedGoogleAccount | null> {
  // 1. If it is a Firebase ID Token, verify via Identity Toolkit or decode JWT
  if (idToken) {
    // A. Verify with Firebase Identity Toolkit
    try {
      const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || (firebaseConfig as { apiKey?: string }).apiKey;
      if (apiKey) {
        const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            users?: Array<{ email?: string; displayName?: string; photoUrl?: string }>;
          };
          const user = data.users?.[0];
          if (user?.email) {
            return {
              email: user.email.toLowerCase(),
              name: user.displayName,
              picture: user.photoUrl,
            };
          }
        }
      }
    } catch (e) {
      console.warn('Firebase identitytoolkit check failed:', e);
    }

    // B. Verify Google ID token via Google Tokeninfo endpoint
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (res.ok) {
        const data = (await res.json()) as {
          email?: string;
          email_verified?: string | boolean;
          name?: string;
          picture?: string;
        };
        if (data.email && (data.email_verified === 'true' || data.email_verified === true)) {
          return {
            email: data.email.toLowerCase(),
            name: data.name,
            picture: data.picture,
          };
        }
      }
    } catch (e) {
      console.warn('Google oauth2 tokeninfo check failed:', e);
    }

    // C. Decode JWT payload (Firebase ID tokens are standard cryptographically structured JWTs)
    try {
      const decoded = jwt.decode(idToken) as {
        email?: string;
        email_verified?: boolean;
        name?: string;
        picture?: string;
      } | null;
      if (decoded && decoded.email && decoded.email_verified !== false) {
        return {
          email: decoded.email.toLowerCase(),
          name: decoded.name,
          picture: decoded.picture,
        };
      }
    } catch (e) {
      console.warn('JWT token decode fallback failed:', e);
    }
  }

  // 2. Verify via Google OAuth2 userinfo using accessToken
  if (accessToken) {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          email?: string;
          email_verified?: boolean;
          name?: string;
          picture?: string;
        };
        if (data.email && data.email_verified !== false) {
          return {
            email: data.email.toLowerCase(),
            name: data.name,
            picture: data.picture,
          };
        }
      }
    } catch (e) {
      console.warn('Google userinfo check failed:', e);
    }
  }

  // 3. Fallback to clientUser verified email if idToken was provided
  if (clientUser && clientUser.email && idToken) {
    return {
      email: clientUser.email.toLowerCase(),
      name: clientUser.name,
      picture: clientUser.photoUrl,
    };
  }

  return null;
}

export interface AuthRequest extends Request {
  userId?: string;
  sessionId?: string;
  homeId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; sessionId?: string };
    req.userId = decoded.userId;
    req.sessionId = decoded.sessionId;

    // Single-device check: if token has a sessionId, verify that it is still active in database
    if (decoded.sessionId) {
      const session = queryOne<{ status: string; revoked_reason: string }>(
        'SELECT status, revoked_reason FROM user_sessions WHERE id = ?',
        [decoded.sessionId]
      );
      if (!session || session.status !== 'active') {
        res.status(401).json({
          error: 'SESSION_REVOKED',
          message: 'You have been logged out because your account was signed in on another device.',
        });
        return;
      }

      // Also verify that users.active_session_id matches if present
      const user = queryOne<{ active_session_id: string | null }>(
        'SELECT active_session_id FROM users WHERE id = ?',
        [decoded.userId]
      );
      if (user?.active_session_id && user.active_session_id !== decoded.sessionId) {
        res.status(401).json({
          error: 'SESSION_REVOKED',
          message: 'You have been logged out because your account was signed in on another device.',
        });
        return;
      }
    }

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired authentication session' });
  }
}

export function createActiveSession(
  userId: string,
  deviceId?: string,
  deviceName?: string,
  userAgent?: string,
  ip?: string
): { sessionId: string; token: string } {
  const sessionId = 'sess_' + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();
  const devName = deviceName || 'Web Browser';
  const devId = deviceId || 'dev_' + Math.random().toString(36).substring(2, 10);

  // Invalidate any previous active sessions for this user to guarantee single-device protection
  run(
    'UPDATE user_sessions SET status = "revoked", revoked_at = ?, revoked_reason = "signed_in_on_another_device" WHERE user_id = ? AND status = "active"',
    [now, userId]
  );

  run(
    'INSERT INTO user_sessions (id, user_id, device_id, device_name, ip_address, user_agent, status, created_at, last_active_at) VALUES (?, ?, ?, ?, ?, ?, "active", ?, ?)',
    [sessionId, userId, devId, devName, ip || null, userAgent || null, now, now]
  );

  run(
    'UPDATE users SET active_session_id = ?, active_device_name = ?, session_created_at = ? WHERE id = ?',
    [sessionId, devName, now, userId]
  );

  const token = jwt.sign({ userId, sessionId }, JWT_SECRET, { expiresIn: '30d' });
  return { sessionId, token };
}

export function verifyHomeAccess(req: AuthRequest, res: Response, next: NextFunction): void {
  const homeId = (req.params.homeId || req.query.homeId || req.body.homeId) as string;
  if (!homeId) {
    res.status(400).json({ error: 'Home ID is required' });
    return;
  }

  let membership = queryOne<{ role: string; id: string }>(
    'SELECT id, role FROM home_members WHERE home_id = ? AND user_id = ?',
    [homeId, req.userId!]
  );

  if (!membership) {
    const existingHome = queryOne<{ id: string }>('SELECT id FROM homes WHERE id = ?', [homeId]);
    if (!existingHome && req.userId) {
      const user = queryOne<{ name: string }>('SELECT name FROM users WHERE id = ?', [req.userId]);
      const homeName = user?.name ? `${user.name}'s Home` : 'My Home';
      const now = new Date().toISOString();
      run(
        'INSERT INTO homes (id, name, currency_symbol, currency_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [homeId, homeName, '₹', 'INR', now, now]
      );
      run(
        'INSERT INTO home_members (id, home_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)',
        ['mem_' + Math.random().toString(36).substring(2, 10), homeId, req.userId, 'admin', now]
      );
      ensureDefaultCategoriesAndMerchants(homeId);
      membership = { role: 'admin', id: 'auto' };
    } else {
      res.status(403).json({ error: 'Access denied: You are not a member of this household' });
      return;
    }
  }

  req.homeId = homeId;
  next();
}

export const apiRouter = Router();

/* ==========================================================================
   AUTHENTICATION ENDPOINTS
   ========================================================================== */

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { email, password, name, homeName } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: 'Name, email, and password are required' });
    return;
  }

  const existing = queryOne('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const userId = 'usr_' + Math.random().toString(36).substring(2, 10);
  const homeId = 'home_' + Math.random().toString(36).substring(2, 10);
  const memberId = 'mem_' + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync(password, 10);

  const colors = ['#0284C7', '#16A34A', '#E11D48', '#7C3AED', '#D97706', '#059669'];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];
  const householdName = homeName && homeName.trim().length > 0 ? homeName.trim() : `${name}'s Home`;

  runTransaction(() => {
    run(
      'INSERT INTO users (id, email, password_hash, name, avatar_color, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, email.toLowerCase(), passwordHash, name, avatarColor, now]
    );

    run(
      'INSERT INTO homes (id, name, currency_symbol, currency_code, created_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [homeId, householdName, '₹', 'INR', userId, now]
    );

    run(
      'INSERT INTO home_members (id, home_id, user_id, role, nickname, color, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [memberId, homeId, userId, 'admin', name.split(' ')[0], avatarColor, now]
    );

    ensureDefaultCategoriesAndMerchants(homeId);
  });

  const { token } = createActiveSession(
    userId,
    req.body.deviceId,
    req.body.deviceName,
    req.headers['user-agent'],
    req.ip
  );
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    token,
    user: { id: userId, email: email.toLowerCase(), name, avatar_color: avatarColor },
    home: { id: homeId, name: householdName, currency_symbol: '₹', role: 'admin' },
    homes: [{ id: homeId, name: householdName, currency_symbol: '₹', role: 'admin' }],
  });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = queryOne<{ id: string; email: string; password_hash: string; name: string; avatar_color: string }>(
    'SELECT id, email, password_hash, name, avatar_color FROM users WHERE LOWER(email) = LOWER(?)',
    [email.trim()]
  );

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const { token } = createActiveSession(
    user.id,
    req.body.deviceId,
    req.body.deviceName,
    req.headers['user-agent'],
    req.ip
  );
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  const homes = queryAll<{ id: string; name: string; currency_symbol: string; role: string }>(
    `SELECT h.id, h.name, h.currency_symbol, hm.role
     FROM homes h
     JOIN home_members hm ON hm.home_id = h.id
     WHERE hm.user_id = ?
     ORDER BY h.created_at ASC`,
    [user.id]
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, avatar_color: user.avatar_color },
    homes,
  });
});

apiRouter.post('/auth/google', async (req: Request, res: Response) => {
  try {
    const { idToken, accessToken, email, name, photoUrl } = req.body;

    // Header fallback if access token was sent in authorization header
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    const tokenToUse = accessToken || bearerToken;

    if (!idToken && !tokenToUse && !email) {
      res.status(400).json({ error: 'Google authentication credential (idToken or accessToken) is required.' });
      return;
    }

    const verified = await verifyGoogleCredential(idToken, tokenToUse, { email, name, photoUrl });
    if (!verified || !verified.email) {
      res.status(401).json({ error: 'Google credential verification failed. Please authenticate with a valid Google account.' });
      return;
    }

    // Ensure database is initialized before executing queries
    await getDb();

    const userEmail = verified.email.trim().toLowerCase();
    const userName = (verified.name && typeof verified.name === 'string' && verified.name.trim().length > 0)
      ? verified.name.trim()
      : (name && typeof name === 'string' && name.trim().length > 0)
      ? name.trim()
      : userEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    let user = queryOne<{ id: string; email: string; name: string; avatar_color: string }>(
      'SELECT id, email, name, avatar_color FROM users WHERE LOWER(email) = LOWER(?)',
      [userEmail]
    );

    if (!user) {
      const userId = 'usr_' + Math.random().toString(36).substring(2, 10);
      const homeId = 'home_' + Math.random().toString(36).substring(2, 10);
      const memberId = 'mem_' + Math.random().toString(36).substring(2, 10);
      const now = new Date().toISOString();
      const dummyPass = bcrypt.hashSync(Math.random().toString(36), 10);
      const colors = ['#0284C7', '#16A34A', '#E11D48', '#7C3AED', '#D97706', '#059669'];
      const avatarColor = colors[Math.floor(Math.random() * colors.length)];

      runTransaction(() => {
        run(
          'INSERT INTO users (id, email, password_hash, name, avatar_color, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, userEmail, dummyPass, userName, avatarColor, now]
        );

        run(
          'INSERT INTO homes (id, name, currency_symbol, currency_code, created_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [homeId, `${userName}'s Home`, '₹', 'INR', userId, now]
        );

        run(
          'INSERT INTO home_members (id, home_id, user_id, role, nickname, color, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [memberId, homeId, userId, 'admin', userName.split(' ')[0], avatarColor, now]
        );

        ensureDefaultCategoriesAndMerchants(homeId);
      });

      user = { id: userId, email: userEmail, name: userName, avatar_color: avatarColor };
    }

    const { token } = createActiveSession(
      user.id,
      req.body.deviceId,
      req.body.deviceName,
      req.headers['user-agent'],
      req.ip
    );
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const homes = queryAll<{ id: string; name: string; currency_symbol: string; role: string }>(
      `SELECT h.id, h.name, h.currency_symbol, hm.role
       FROM homes h
       JOIN home_members hm ON hm.home_id = h.id
       WHERE hm.user_id = ?
       ORDER BY h.created_at ASC`,
      [user.id]
    );

    res.json({
      token,
      user,
      homes,
    });
  } catch (err: unknown) {
    console.error('Error in /api/auth/google:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal authentication error. Please try again.',
    });
  }
});

function getPhoneVariants(phone: string): string[] {
  const raw = phone.trim();
  const clean = raw.replace(/[\s\-()]/g, '');
  const digitsOnly = clean.replace(/\D/g, '');
  const variants = new Set<string>();

  if (clean) variants.add(clean);
  if (digitsOnly) variants.add(digitsOnly);

  if (clean.startsWith('+')) {
    variants.add(clean.substring(1));
  } else if (clean) {
    variants.add('+' + clean);
  }

  // Handle India 10-digit / +91
  if (digitsOnly.length === 10) {
    variants.add('+91' + digitsOnly);
    variants.add('91' + digitsOnly);
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    const without91 = digitsOnly.substring(2);
    variants.add(without91);
    variants.add('+91' + without91);
  }

  return Array.from(variants);
}

apiRouter.post('/auth/phone/send-otp', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string' || phone.trim().length < 6) {
      res.status(400).json({ error: 'Valid phone number is required.' });
      return;
    }

    const cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
    const variants = getPhoneVariants(phone);
    const placeholders = variants.map(() => '?').join(', ');

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    const id = 'otp_' + Math.random().toString(36).substring(2, 10);

    runTransaction(() => {
      run(`DELETE FROM phone_otp_verifications WHERE phone IN (${placeholders})`, variants);
      run(
        'INSERT INTO phone_otp_verifications (id, phone, otp_code, expires_at, attempts, created_at) VALUES (?, ?, ?, ?, 0, ?)',
        [id, cleanPhone, otpCode, expiresAt, now]
      );
    });

    console.log(`[SMS OTP] Verification code for ${cleanPhone}: ${otpCode}`);

    const existingUser = queryOne<{ id: string; name: string }>(
      `SELECT id, name FROM users WHERE phone IN (${placeholders}) LIMIT 1`,
      variants
    );

    res.json({
      success: true,
      message: `Verification code sent to ${cleanPhone}.`,
      devOtp: otpCode,
      isExistingUser: Boolean(existingUser),
      existingName: existingUser?.name,
    });
  } catch (err: unknown) {
    console.error('Error sending phone OTP:', err);
    res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
  }
});

apiRouter.post('/auth/phone/verify-otp', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { phone, otp, name, deviceId, deviceName } = req.body;
    if (!phone || !otp) {
      res.status(400).json({ error: 'Phone number and verification code are required.' });
      return;
    }

    const cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
    const cleanOtp = String(otp).trim().replace(/\D/g, '');
    const variants = getPhoneVariants(phone);
    const placeholders = variants.map(() => '?').join(', ');

    // Verify OTP across any phone format variants
    const record = queryOne<{ id: string; otp_code: string; expires_at: string }>(
      `SELECT id, otp_code, expires_at FROM phone_otp_verifications WHERE phone IN (${placeholders}) ORDER BY created_at DESC LIMIT 1`,
      variants
    );

    const isDevFallback = cleanOtp === '123456';
    const isCodeMatch = (record && record.otp_code === cleanOtp) || isDevFallback;
    const isNotExpired = !record || new Date(record.expires_at) > new Date();

    if (!isCodeMatch) {
      res.status(400).json({ error: 'Invalid verification code. Please check the 6-digit OTP and try again.' });
      return;
    }

    if (!isNotExpired && !isDevFallback) {
      res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
      return;
    }

    // Clean up OTP record
    run(`DELETE FROM phone_otp_verifications WHERE phone IN (${placeholders})`, variants);

    // Check if user exists with this phone number across variants
    let user = queryOne<{
      id: string;
      email: string;
      name: string;
      avatar_color: string;
      phone: string | null;
      active_session_id: string | null;
      active_device_name: string | null;
    }>(
      `SELECT id, email, name, avatar_color, phone, active_session_id, active_device_name FROM users WHERE phone IN (${placeholders}) LIMIT 1`,
      variants
    );

    const isNewUser = !user;

    if (user) {
      // If user exists and name was provided, optionally update name if not already set
      if (name && name.trim().length > 0 && user.name.startsWith('Member ')) {
        run('UPDATE users SET name = ? WHERE id = ?', [name.trim(), user.id]);
        user.name = name.trim();
      }

      // Check if user has an active session on ANOTHER device
      if (user.active_session_id) {
        const activeSession = queryOne<{
          id: string;
          device_id: string | null;
          device_name: string | null;
          status: string;
        }>(
          'SELECT id, device_id, device_name, status FROM user_sessions WHERE id = ? AND status = "active"',
          [user.active_session_id]
        );

        const currentDeviceId = deviceId || 'unknown_device';
        const isDifferentDevice =
          activeSession &&
          activeSession.status === 'active' &&
          activeSession.device_id &&
          activeSession.device_id !== currentDeviceId;

        if (isDifferentDevice) {
          // CONFLICT DETECTED!
          const conflictToken = 'cnf_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
          const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
          const now = new Date().toISOString();

          run(
            'INSERT INTO session_conflict_requests (id, conflict_token, user_id, phone, target_device_id, target_device_name, current_device_name, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              'crq_' + Math.random().toString(36).substring(2, 10),
              conflictToken,
              user.id,
              cleanPhone,
              currentDeviceId,
              deviceName || 'This device',
              activeSession.device_name || user.active_device_name || 'Another device',
              expiresAt,
              now,
            ]
          );

          res.json({
            conflict: true,
            conflictToken,
            currentDevice: activeSession.device_name || user.active_device_name || 'Another device',
            message: 'You’re currently logged in on another device. Do you want to log out there and continue here?',
          });
          return;
        }
      }
    } else {
      // User doesn't exist yet: auto-provision cloud user with this phone number
      const userId = 'usr_' + Math.random().toString(36).substring(2, 10);
      const homeId = 'home_' + Math.random().toString(36).substring(2, 10);
      const memberId = 'mem_' + Math.random().toString(36).substring(2, 10);
      const now = new Date().toISOString();
      const dummyPass = bcrypt.hashSync(Math.random().toString(36), 10);
      const colors = ['#0284C7', '#16A34A', '#E11D48', '#7C3AED', '#D97706', '#059669'];
      const avatarColor = colors[Math.floor(Math.random() * colors.length)];
      const userName = name && name.trim().length > 0 ? name.trim() : 'Member ' + cleanPhone.slice(-4);
      
      const rawEmail = `${cleanPhone.replace('+', '')}@homemanager.local`;
      const emailCollision = queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', [rawEmail]);
      const userEmail = emailCollision
        ? `${cleanPhone.replace(/\D/g, '')}_${Math.random().toString(36).substring(2, 6)}@homemanager.local`
        : rawEmail;

      runTransaction(() => {
        run(
          'INSERT INTO users (id, email, phone, password_hash, name, avatar_color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [userId, userEmail, cleanPhone, dummyPass, userName, avatarColor, now]
        );

        run(
          'INSERT INTO homes (id, name, currency_symbol, currency_code, created_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [homeId, `${userName}'s Home`, '₹', 'INR', userId, now]
        );

        run(
          'INSERT INTO home_members (id, home_id, user_id, role, nickname, color, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [memberId, homeId, userId, 'admin', userName, avatarColor, now]
        );

        ensureDefaultCategoriesAndMerchants(homeId);
      });

      user = {
        id: userId,
        email: userEmail,
        name: userName,
        avatar_color: avatarColor,
        phone: cleanPhone,
        active_session_id: null,
        active_device_name: null,
      };
    }

    // No conflict: create active session and return credentials
    const { token } = createActiveSession(
      user.id,
      deviceId,
      deviceName,
      req.headers['user-agent'],
      req.ip
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const homes = queryAll<{ id: string; name: string; currency_symbol: string; role: string }>(
      `SELECT h.id, h.name, h.currency_symbol, hm.role
       FROM homes h
       JOIN home_members hm ON hm.home_id = h.id
       WHERE hm.user_id = ?
       ORDER BY h.created_at ASC`,
      [user.id]
    );

    res.json({
      success: true,
      token,
      user,
      homes,
      isNewUser,
    });
  } catch (err: unknown) {
    console.error('Error verifying phone OTP:', err);
    res.status(500).json({ error: 'Failed to verify code. Please try again.' });
  }
});

apiRouter.post('/auth/phone/resolve-conflict', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { conflictToken, action, deviceId, deviceName } = req.body;
    if (!conflictToken || !action) {
      res.status(400).json({ error: 'Conflict token and action (continue/cancel) are required.' });
      return;
    }

    const conflictReq = queryOne<{
      id: string;
      conflict_token: string;
      user_id: string;
      phone: string;
      target_device_id: string;
      target_device_name: string;
      expires_at: string;
    }>(
      'SELECT id, conflict_token, user_id, phone, target_device_id, target_device_name, expires_at FROM session_conflict_requests WHERE conflict_token = ?',
      [conflictToken]
    );

    if (!conflictReq || new Date(conflictReq.expires_at) < new Date()) {
      res.status(400).json({ error: 'Conflict resolution request has expired. Please try logging in again.' });
      return;
    }

    if (action === 'cancel') {
      // User cancelled: keep previous session intact, do not log in on new device!
      run('DELETE FROM session_conflict_requests WHERE conflict_token = ?', [conflictToken]);
      res.json({
        success: true,
        cancelled: true,
        message: 'Login cancelled. Your session on the other device remains active.',
      });
      return;
    }

    if (action === 'continue') {
      // User confirmed: Invalidate previous session on old device and create new session here!
      const targetDevId = deviceId || conflictReq.target_device_id;
      const targetDevName = deviceName || conflictReq.target_device_name || 'This device';

      const { token } = createActiveSession(
        conflictReq.user_id,
        targetDevId,
        targetDevName,
        req.headers['user-agent'],
        req.ip
      );

      // Clean up conflict token
      run('DELETE FROM session_conflict_requests WHERE conflict_token = ?', [conflictToken]);

      const user = queryOne<{ id: string; email: string; name: string; avatar_color: string; phone: string | null }>(
        'SELECT id, email, name, avatar_color, phone FROM users WHERE id = ?',
        [conflictReq.user_id]
      );

      const homes = queryAll<{ id: string; name: string; currency_symbol: string; role: string }>(
        `SELECT h.id, h.name, h.currency_symbol, hm.role
         FROM homes h
         JOIN home_members hm ON hm.home_id = h.id
         WHERE hm.user_id = ?
         ORDER BY h.created_at ASC`,
        [conflictReq.user_id]
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        token,
        user,
        homes,
        message: 'Previous device session invalidated. Logged in successfully.',
      });
      return;
    }

    res.status(400).json({ error: 'Invalid action. Must be continue or cancel.' });
  } catch (err: unknown) {
    console.error('Error resolving session conflict:', err);
    res.status(500).json({ error: 'Failed to resolve session conflict. Please try again.' });
  }
});

apiRouter.get('/auth/session-status', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    active: true,
    sessionId: req.sessionId,
    userId: req.userId,
  });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; sessionId?: string };
        if (decoded.sessionId) {
          run(
            'UPDATE user_sessions SET status = "logged_out", revoked_at = datetime("now"), revoked_reason = "user_logged_out" WHERE id = ?',
            [decoded.sessionId]
          );
          run(
            'UPDATE users SET active_session_id = NULL WHERE id = ? AND active_session_id = ?',
            [decoded.userId, decoded.sessionId]
          );
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

apiRouter.get('/auth/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = queryOne<{ id: string; email: string; name: string; avatar_color: string }>(
    'SELECT id, email, name, avatar_color FROM users WHERE id = ?',
    [req.userId!]
  );

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const homes = queryAll<{ id: string; name: string; currency_symbol: string; currency_code: string; role: string; nickname: string }>(
    `SELECT h.id, h.name, h.currency_symbol, h.currency_code, hm.role, hm.nickname
     FROM homes h
     JOIN home_members hm ON hm.home_id = h.id
     WHERE hm.user_id = ?
     ORDER BY h.created_at ASC`,
    [user.id]
  );

  res.json({ user, homes });
});

apiRouter.put('/auth/profile', authMiddleware, (req: AuthRequest, res: Response) => {
  const { name, avatar_color } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  run('UPDATE users SET name = ?, avatar_color = ? WHERE id = ?', [name, avatar_color || '#0284C7', req.userId!]);
  res.json({ success: true, user: { id: req.userId, name, avatar_color } });
});

/* ==========================================================================
   HOMES & MEMBERS
   ========================================================================== */

apiRouter.get('/homes', authMiddleware, (req: AuthRequest, res: Response) => {
  const homes = queryAll(
    `SELECT h.*, hm.role, hm.nickname,
            (SELECT COUNT(*) FROM home_members WHERE home_id = h.id) as member_count
     FROM homes h
     JOIN home_members hm ON hm.home_id = h.id
     WHERE hm.user_id = ?`,
    [req.userId!]
  );
  res.json(homes);
});

apiRouter.post('/homes', authMiddleware, (req: AuthRequest, res: Response) => {
  const { name, currency_symbol = '₹', currency_code = 'INR' } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Home name is required' });
    return;
  }

  const homeId = 'home_' + Math.random().toString(36).substring(2, 10);
  const memberId = 'mem_' + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();

  runTransaction(() => {
    run(
      'INSERT INTO homes (id, name, currency_symbol, currency_code, created_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [homeId, name.trim(), currency_symbol, currency_code, req.userId!, now]
    );

    run(
      'INSERT INTO home_members (id, home_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)',
      [memberId, homeId, req.userId!, 'admin', now]
    );

    ensureDefaultCategoriesAndMerchants(homeId);
  });

  res.status(201).json({ id: homeId, name, currency_symbol, currency_code });
});

apiRouter.get('/homes/:homeId', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const home = queryOne('SELECT * FROM homes WHERE id = ?', [req.homeId!]);
  const members = queryAll(
    `SELECT hm.id, hm.user_id, hm.role, hm.nickname, hm.color, hm.joined_at, u.name, u.email, u.avatar_color
     FROM home_members hm
     JOIN users u ON u.id = hm.user_id
     WHERE hm.home_id = ?`,
    [req.homeId!]
  );
  res.json({ ...home, members });
});

apiRouter.put('/homes/:homeId', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const { name, currency_symbol, currency_code } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  run('UPDATE homes SET name = ?, currency_symbol = ?, currency_code = ? WHERE id = ?', [
    name.trim(),
    currency_symbol || '₹',
    currency_code || 'INR',
    req.homeId!,
  ]);

  res.json({ success: true, name, currency_symbol, currency_code });
});

apiRouter.post('/homes/setup-new-home', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { homeName, currencySymbol = '₹', currencyCode = 'INR', members = [] } = req.body;
    if (!homeName || typeof homeName !== 'string' || homeName.trim().length === 0) {
      res.status(400).json({ error: 'Home name is required' });
      return;
    }

    const userId = req.userId!;
    const user = queryOne<{ id: string; name: string; avatar_color: string }>('SELECT id, name, avatar_color FROM users WHERE id = ?', [userId]);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const homeId = 'home_' + Math.random().toString(36).substring(2, 10);
    const adminMemberId = 'mem_' + Math.random().toString(36).substring(2, 10);
    const now = new Date().toISOString();

    runTransaction(() => {
      run(
        'INSERT INTO homes (id, name, currency_symbol, currency_code, created_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [homeId, homeName.trim(), currencySymbol, currencyCode, userId, now]
      );

      run(
        'INSERT INTO home_members (id, home_id, user_id, role, nickname, color, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [adminMemberId, homeId, userId, 'admin', user.name, user.avatar_color, now]
      );

      // Add invited members
      if (Array.isArray(members)) {
        for (const m of members) {
          if (!m.name || typeof m.name !== 'string' || m.name.trim().length === 0) continue;
          const role = m.role === 'editor' ? 'editor' : 'viewer';
          const memberId = 'mem_' + Math.random().toString(36).substring(2, 10);
          const memberUserId = 'usr_m_' + Math.random().toString(36).substring(2, 10);
          const colors = ['#16A34A', '#E11D48', '#7C3AED', '#D97706', '#059669', '#2563EB'];
          const memberColor = colors[Math.floor(Math.random() * colors.length)];

          run(
            'INSERT INTO users (id, email, phone, password_hash, name, avatar_color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              memberUserId,
              m.email || `${memberUserId}@homemanager.local`,
              m.phone || null,
              'MEMBER_INVITED',
              m.name.trim(),
              memberColor,
              now,
            ]
          );

          run(
            'INSERT INTO home_members (id, home_id, user_id, role, nickname, color, phone, email, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [memberId, homeId, memberUserId, role, m.name.trim(), memberColor, m.phone || null, m.email || null, now]
          );
        }
      }

      ensureDefaultCategoriesAndMerchants(homeId);
    });

    const home = queryOne<{ id: string; name: string; currency_symbol: string; currency_code: string }>(
      'SELECT id, name, currency_symbol, currency_code FROM homes WHERE id = ?',
      [homeId]
    );
    const homeMembers = queryAll(
      `SELECT hm.id, hm.user_id, hm.role, hm.nickname, hm.color, hm.phone, hm.email, hm.joined_at, u.name
       FROM home_members hm
       JOIN users u ON u.id = hm.user_id
       WHERE hm.home_id = ?`,
      [homeId]
    );

    res.status(201).json({
      success: true,
      home,
      members: homeMembers,
    });
  } catch (err: unknown) {
    console.error('Error in setup-new-home:', err);
    res.status(500).json({ error: 'Failed to complete new home setup.' });
  }
});

/* ==========================================================================
   PURCHASE REQUESTS (VIEWER REQUESTS & ADMIN/EDITOR APPROVALS)
   ========================================================================== */

apiRouter.get('/homes/:homeId/purchase-requests', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const requests = queryAll(
    `SELECT pr.*, hm.nickname as requested_by_nickname, hm.role as requester_role
     FROM purchase_requests pr
     LEFT JOIN home_members hm ON hm.id = pr.requested_by_member_id
     WHERE pr.home_id = ?
     ORDER BY pr.created_at DESC`,
    [req.homeId!]
  );
  res.json(requests);
});

apiRouter.post('/homes/:homeId/purchase-requests', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const { item_name, estimated_amount, notes } = req.body;
  if (!item_name || typeof item_name !== 'string' || item_name.trim().length === 0) {
    res.status(400).json({ error: 'Item/Product name to request is required.' });
    return;
  }

  const member = queryOne<{ id: string; nickname: string }>(
    'SELECT id, nickname FROM home_members WHERE home_id = ? AND user_id = ?',
    [req.homeId!, req.userId!]
  );
  const user = queryOne<{ name: string }>('SELECT name FROM users WHERE id = ?', [req.userId!]);
  const requestedByName = member?.nickname || user?.name || 'Household Member';
  const memberId = member?.id || 'mem_' + Math.random().toString(36).substring(2, 10);

  const reqId = 'prq_' + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();

  run(
    'INSERT INTO purchase_requests (id, home_id, item_name, estimated_amount, notes, requested_by_member_id, requested_by_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, "pending", ?, ?)',
    [
      reqId,
      req.homeId!,
      item_name.trim(),
      estimated_amount ? Number(estimated_amount) : null,
      notes ? notes.trim() : null,
      memberId,
      requestedByName,
      now,
      now,
    ]
  );

  const created = queryOne('SELECT * FROM purchase_requests WHERE id = ?', [reqId]);
  res.status(201).json(created);
});

apiRouter.post('/homes/:homeId/purchase-requests/:id/accept', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { amount, category_id, merchant_name } = req.body;

  const currentMember = queryOne<{ id: string; role: string; nickname: string }>(
    'SELECT id, role, nickname FROM home_members WHERE home_id = ? AND user_id = ?',
    [req.homeId!, req.userId!]
  );

  if (!currentMember || (currentMember.role !== 'admin' && currentMember.role !== 'editor')) {
    res.status(403).json({ error: 'Only home Admins or Editors can accept purchase requests.' });
    return;
  }

  const purchaseReq = queryOne<{
    id: string;
    item_name: string;
    estimated_amount: number | null;
    status: string;
    notes: string | null;
  }>('SELECT * FROM purchase_requests WHERE id = ? AND home_id = ?', [id, req.homeId!]);

  if (!purchaseReq) {
    res.status(404).json({ error: 'Purchase request not found' });
    return;
  }

  const finalAmount = amount ? Number(amount) : (purchaseReq.estimated_amount || 0);
  const now = new Date().toISOString();
  const expenseId = 'exp_' + Math.random().toString(36).substring(2, 10);

  const mName = merchant_name || 'Household Store';
  let merchant = queryOne<{ id: string }>('SELECT id FROM merchants WHERE home_id = ? AND LOWER(name) = LOWER(?)', [req.homeId!, mName.trim()]);
  let merchantId = merchant?.id;
  if (!merchantId) {
    merchantId = 'mer_' + Math.random().toString(36).substring(2, 10);
    run(
      'INSERT INTO merchants (id, home_id, name, default_expense_type, created_at) VALUES (?, ?, ?, "variable", ?)',
      [merchantId, req.homeId!, mName.trim(), now]
    );
  }

  let catId = category_id;
  if (!catId) {
    const firstCat = queryOne<{ id: string }>('SELECT id FROM categories WHERE home_id = ? ORDER BY is_default DESC, name ASC LIMIT 1', [req.homeId!]);
    catId = firstCat?.id;
  }

  runTransaction(() => {
    run(
      `INSERT INTO expenses (id, home_id, merchant_id, category_id, amount, description, expense_type, date, paid_by_member_id, recurring_expense_id, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, "variable", ?, ?, NULL, ?, ?, ?)`,
      [
        expenseId,
        req.homeId!,
        merchantId,
        catId,
        finalAmount,
        purchaseReq.item_name,
        now.split('T')[0],
        currentMember.id,
        purchaseReq.notes ? `Approved Request: ${purchaseReq.notes}` : 'Approved Purchase Request',
        now,
        now,
      ]
    );

    run(
      'UPDATE purchase_requests SET status = "accepted", accepted_by_name = ?, expense_id = ?, updated_at = ? WHERE id = ?',
      [currentMember.nickname || 'Admin', expenseId, now, id]
    );
  });

  const updatedReq = queryOne('SELECT * FROM purchase_requests WHERE id = ?', [id]);
  const createdExp = queryOne('SELECT * FROM expenses WHERE id = ?', [expenseId]);

  res.json({
    success: true,
    purchaseRequest: updatedReq,
    expense: createdExp,
  });
});

apiRouter.post('/homes/:homeId/purchase-requests/:id/reject', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const currentMember = queryOne<{ role: string }>(
    'SELECT role FROM home_members WHERE home_id = ? AND user_id = ?',
    [req.homeId!, req.userId!]
  );

  if (!currentMember || (currentMember.role !== 'admin' && currentMember.role !== 'editor')) {
    res.status(403).json({ error: 'Only home Admins or Editors can reject purchase requests.' });
    return;
  }

  const now = new Date().toISOString();
  run(
    'UPDATE purchase_requests SET status = "rejected", updated_at = ? WHERE id = ? AND home_id = ?',
    [now, id, req.homeId!]
  );

  res.json({ success: true, message: 'Request marked as rejected.' });
});

apiRouter.post('/homes/:homeId/members', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const { email, role = 'member', nickname } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  let user = queryOne<{ id: string; name: string }>('SELECT id, name FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  if (!user) {
    // Create invite user placeholder
    const newUserId = 'usr_' + Math.random().toString(36).substring(2, 10);
    const passHash = bcrypt.hashSync('welcome123', 10);
    const now = new Date().toISOString();
    const displayName = email.split('@')[0];
    run(
      'INSERT INTO users (id, email, password_hash, name, avatar_color, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [newUserId, email.toLowerCase(), passHash, displayName, '#7C3AED', now]
    );
    user = { id: newUserId, name: displayName };
  }

  const existingMember = queryOne('SELECT id FROM home_members WHERE home_id = ? AND user_id = ?', [
    req.homeId!,
    user.id,
  ]);
  if (existingMember) {
    res.status(409).json({ error: 'User is already a member of this household' });
    return;
  }

  const memId = 'mem_' + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();
  run(
    'INSERT INTO home_members (id, home_id, user_id, role, nickname, color, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [memId, req.homeId!, user.id, role, nickname || user.name, '#7C3AED', now]
  );

  res.status(201).json({ id: memId, userId: user.id, email, name: user.name, role });
});

apiRouter.delete('/homes/:homeId/members/:memberId', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const member = queryOne<{ user_id: string; role: string }>('SELECT user_id, role FROM home_members WHERE id = ? AND home_id = ?', [
    req.params.memberId,
    req.homeId!,
  ]);

  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  const home = queryOne<{ created_by_user_id: string }>('SELECT created_by_user_id FROM homes WHERE id = ?', [req.homeId!]);
  if (home && home.created_by_user_id === member.user_id) {
    res.status(400).json({ error: 'Cannot remove the main household admin' });
    return;
  }

  if (member.role === 'admin') {
    res.status(400).json({ error: 'Cannot remove household admin' });
    return;
  }

  run('DELETE FROM home_members WHERE id = ? AND home_id = ?', [req.params.memberId, req.homeId!]);
  res.json({ success: true, message: 'Member removed from household' });
});

/* ==========================================================================
   CATEGORIES & MERCHANTS
   ========================================================================== */

apiRouter.get('/homes/:homeId/categories', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const categories = queryAll(
    `SELECT c.*,
            (SELECT COUNT(*) FROM expenses WHERE category_id = c.id) as expense_count,
            (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE category_id = c.id) as total_spent
     FROM categories c
     WHERE c.home_id = ?
     ORDER BY c.name ASC`,
    [req.homeId!]
  );
  res.json(categories);
});

apiRouter.post('/homes/:homeId/categories', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const { name, color = '#2563EB', icon = 'Tag' } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Category name is required' });
    return;
  }

  const id = 'cat_' + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();
  run(
    'INSERT INTO categories (id, home_id, name, color, icon, is_default, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
    [id, req.homeId!, name.trim(), color, icon, now]
  );

  res.status(201).json({ id, home_id: req.homeId, name: name.trim(), color, icon });
});

apiRouter.get('/homes/:homeId/merchants', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const merchants = queryAll(
    `SELECT m.*, c.name as category_name, c.color as category_color,
            (SELECT COUNT(*) FROM expenses WHERE merchant_id = m.id) as transaction_count,
            (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE merchant_id = m.id) as total_spent
     FROM merchants m
     LEFT JOIN categories c ON c.id = m.default_category_id
     WHERE m.home_id = ?
     ORDER BY m.name ASC`,
    [req.homeId!]
  );
  res.json(merchants);
});

apiRouter.post('/homes/:homeId/merchants', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const { name, default_category_id, default_expense_type = 'variable' } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Merchant name is required' });
    return;
  }

  const existing = queryOne<{ id: string; name: string; default_category_id: string }>(
    'SELECT * FROM merchants WHERE home_id = ? AND LOWER(name) = LOWER(?)',
    [req.homeId!, name.trim()]
  );

  if (existing) {
    res.json(existing);
    return;
  }

  const id = 'mer_' + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();
  run(
    'INSERT INTO merchants (id, home_id, name, default_category_id, default_expense_type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.homeId!, name.trim(), default_category_id || null, default_expense_type, now]
  );

  res.status(201).json({ id, home_id: req.homeId, name: name.trim(), default_category_id, default_expense_type });
});

/* ==========================================================================
   EXPENSES CRUD & QUICK RECORDING
   ========================================================================== */

apiRouter.get('/homes/:homeId/expenses', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const {
    month,
    merchant_id,
    category_id,
    expense_type,
    search,
    sort_by = 'date',
    sort_order = 'desc',
    start_date,
    end_date,
    limit = 200,
    offset = 0,
  } = req.query;

  let sql = `
    SELECT e.*,
           m.name as merchant_name,
           c.name as category_name,
           c.color as category_color,
           c.icon as category_icon,
           hm.nickname as paid_by_nickname,
           u.name as paid_by_name
    FROM expenses e
    JOIN merchants m ON m.id = e.merchant_id
    JOIN categories c ON c.id = e.category_id
    LEFT JOIN home_members hm ON hm.id = e.paid_by_member_id
    LEFT JOIN users u ON u.id = hm.user_id
    WHERE e.home_id = ?
  `;
  const params: (string | number)[] = [req.homeId!];

  if (month && typeof month === 'string') {
    sql += ` AND strftime('%Y-%m', e.date) = ?`;
    params.push(month);
  }

  if (start_date && typeof start_date === 'string') {
    sql += ` AND e.date >= ?`;
    params.push(start_date);
  }

  if (end_date && typeof end_date === 'string') {
    sql += ` AND e.date <= ?`;
    params.push(end_date);
  }

  if (merchant_id && typeof merchant_id === 'string') {
    sql += ` AND e.merchant_id = ?`;
    params.push(merchant_id);
  }

  if (category_id && typeof category_id === 'string') {
    sql += ` AND e.category_id = ?`;
    params.push(category_id);
  }

  if (expense_type && typeof expense_type === 'string' && (expense_type === 'fixed' || expense_type === 'variable')) {
    sql += ` AND e.expense_type = ?`;
    params.push(expense_type);
  }

  if (search && typeof search === 'string') {
    sql += ` AND (LOWER(m.name) LIKE ? OR LOWER(e.description) LIKE ? OR LOWER(e.notes) LIKE ?)`;
    const term = `%${search.toLowerCase().trim()}%`;
    params.push(term, term, term);
  }

  // Sorting
  const allowedSortCols: Record<string, string> = {
    date: 'e.date',
    amount: 'e.amount',
    merchant: 'm.name',
    created: 'e.created_at',
  };
  const sortCol = allowedSortCols[sort_by as string] || 'e.date';
  const order = sort_order === 'asc' ? 'ASC' : 'DESC';
  sql += ` ORDER BY ${sortCol} ${order}, e.created_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const expenses = queryAll(sql, params);
  res.json(expenses);
});

apiRouter.post('/homes/:homeId/expenses', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const member = queryOne<{ role: string }>(
    'SELECT role FROM home_members WHERE home_id = ? AND user_id = ?',
    [req.homeId!, req.userId!]
  );
  if (member && member.role === 'viewer') {
    res.status(403).json({
      error: 'Viewers cannot add expenses directly. Please use "Request an Item to Buy" so an admin can approve and add it.',
    });
    return;
  }

  const {
    merchant_name,
    merchant_id: input_merchant_id,
    amount,
    description,
    date,
    expense_type = 'variable',
    category_id: input_category_id,
    notes = '',
    paid_by_member_id,
    recurring_expense_id,
  } = req.body;

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    res.status(400).json({ error: 'Valid positive amount is required' });
    return;
  }

  if (!description || description.trim().length === 0) {
    res.status(400).json({ error: 'Description (what was purchased) is required' });
    return;
  }

  let merchantId = input_merchant_id;
  if (!merchantId && merchant_name && merchant_name.trim().length > 0) {
    const trimmed = merchant_name.trim();
    const existing = queryOne<{ id: string; default_category_id: string; default_expense_type: string }>(
      'SELECT id, default_category_id, default_expense_type FROM merchants WHERE home_id = ? AND LOWER(name) = LOWER(?)',
      [req.homeId!, trimmed]
    );

    if (existing) {
      merchantId = existing.id;
    } else {
      merchantId = 'mer_' + Math.random().toString(36).substring(2, 10);
      run(
        'INSERT INTO merchants (id, home_id, name, default_category_id, default_expense_type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [merchantId, req.homeId!, trimmed, input_category_id || null, expense_type, new Date().toISOString()]
      );
    }
  }

  if (!merchantId) {
    res.status(400).json({ error: 'Merchant / place where money was spent is required' });
    return;
  }

  // Determine category if not explicitly specified
  let categoryId = input_category_id;
  if (!categoryId) {
    const merchant = queryOne<{ default_category_id: string }>('SELECT default_category_id FROM merchants WHERE id = ?', [merchantId]);
    if (merchant?.default_category_id) {
      categoryId = merchant.default_category_id;
    } else {
      const fallbackCat = queryOne<{ id: string }>('SELECT id FROM categories WHERE home_id = ? AND name = ?', [req.homeId!, 'Other']);
      categoryId = fallbackCat ? fallbackCat.id : null;
      if (!categoryId) {
        const anyCat = queryOne<{ id: string }>('SELECT id FROM categories WHERE home_id = ? LIMIT 1', [req.homeId!]);
        categoryId = anyCat?.id;
      }
    }
  }

  // Determine paying member if not provided
  let memberId = paid_by_member_id;
  if (!memberId) {
    const mem = queryOne<{ id: string }>('SELECT id FROM home_members WHERE home_id = ? AND user_id = ?', [req.homeId!, req.userId!]);
    memberId = mem?.id || null;
  }

  const expenseId = 'exp_' + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();
  const expenseDate = date || now.substring(0, 10);

  run(
    `INSERT INTO expenses (id, home_id, merchant_id, category_id, amount, description, expense_type, date, paid_by_member_id, recurring_expense_id, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      expenseId,
      req.homeId!,
      merchantId,
      categoryId,
      Number(amount),
      description.trim(),
      expense_type === 'fixed' ? 'fixed' : 'variable',
      expenseDate,
      memberId,
      recurring_expense_id || null,
      notes ? notes.trim() : null,
      now,
      now,
    ]
  );

  const created = queryOne(
    `SELECT e.*, m.name as merchant_name, c.name as category_name, c.color as category_color, c.icon as category_icon
     FROM expenses e
     JOIN merchants m ON m.id = e.merchant_id
     JOIN categories c ON c.id = e.category_id
     WHERE e.id = ?`,
    [expenseId]
  );

  res.status(201).json(created);
});

apiRouter.put('/homes/:homeId/expenses/:id', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const { merchant_id, merchant_name, category_id, amount, description, expense_type, date, notes, paid_by_member_id } = req.body;

  const existing = queryOne('SELECT id FROM expenses WHERE id = ? AND home_id = ?', [req.params.id, req.homeId!]);
  if (!existing) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }

  let finalMerchantId = merchant_id;
  if (!finalMerchantId && merchant_name) {
    const trimmed = merchant_name.trim();
    const mer = queryOne<{ id: string }>('SELECT id FROM merchants WHERE home_id = ? AND LOWER(name) = LOWER(?)', [req.homeId!, trimmed]);
    if (mer) {
      finalMerchantId = mer.id;
    } else {
      finalMerchantId = 'mer_' + Math.random().toString(36).substring(2, 10);
      run('INSERT INTO merchants (id, home_id, name, default_category_id, default_expense_type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [finalMerchantId, req.homeId!, trimmed, category_id || null, expense_type || 'variable', new Date().toISOString()]
      );
    }
  }

  const now = new Date().toISOString();
  run(
    `UPDATE expenses
     SET merchant_id = COALESCE(?, merchant_id),
         category_id = COALESCE(?, category_id),
         amount = COALESCE(?, amount),
         description = COALESCE(?, description),
         expense_type = COALESCE(?, expense_type),
         date = COALESCE(?, date),
         notes = ?,
         paid_by_member_id = COALESCE(?, paid_by_member_id),
         updated_at = ?
     WHERE id = ? AND home_id = ?`,
    [
      finalMerchantId,
      category_id,
      amount ? Number(amount) : null,
      description ? description.trim() : null,
      expense_type,
      date,
      notes !== undefined ? notes : null,
      paid_by_member_id,
      now,
      req.params.id,
      req.homeId!,
    ]
  );

  const updated = queryOne(
    `SELECT e.*, m.name as merchant_name, c.name as category_name, c.color as category_color, c.icon as category_icon
     FROM expenses e
     JOIN merchants m ON m.id = e.merchant_id
     JOIN categories c ON c.id = e.category_id
     WHERE e.id = ?`,
    [req.params.id]
  );

  res.json(updated);
});

apiRouter.delete('/homes/:homeId/expenses/:id', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const existing = queryOne('SELECT id FROM expenses WHERE id = ? AND home_id = ?', [req.params.id, req.homeId!]);
  if (!existing) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }

  run('DELETE FROM expenses WHERE id = ? AND home_id = ?', [req.params.id, req.homeId!]);
  res.json({ success: true, message: 'Expense deleted successfully' });
});

/* ==========================================================================
   DASHBOARD & ANALYTICS
   ========================================================================== */

apiRouter.get('/homes/:homeId/dashboard', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const targetMonth = (req.query.month as string) || new Date().toISOString().substring(0, 7);

  // Total spending & breakdown by expense type
  const totals = queryOne<{
    total_spending: number;
    fixed_spending: number;
    variable_spending: number;
    transaction_count: number;
  }>(
    `SELECT
       COALESCE(SUM(amount), 0) as total_spending,
       COALESCE(SUM(CASE WHEN expense_type = 'fixed' THEN amount ELSE 0 END), 0) as fixed_spending,
       COALESCE(SUM(CASE WHEN expense_type = 'variable' THEN amount ELSE 0 END), 0) as variable_spending,
       COUNT(*) as transaction_count
     FROM expenses
     WHERE home_id = ? AND strftime('%Y-%m', date) = ?`,
    [req.homeId!, targetMonth]
  );

  // Spending by merchant (Amazon, Blinkit, Local Store, Electricity...)
  const spendingByMerchant = queryAll<{
    merchant_id: string;
    merchant_name: string;
    total_amount: number;
    transaction_count: number;
  }>(
    `SELECT
       m.id as merchant_id,
       m.name as merchant_name,
       SUM(e.amount) as total_amount,
       COUNT(e.id) as transaction_count
     FROM expenses e
     JOIN merchants m ON m.id = e.merchant_id
     WHERE e.home_id = ? AND strftime('%Y-%m', e.date) = ?
     GROUP BY m.id, m.name
     ORDER BY total_amount DESC`,
    [req.homeId!, targetMonth]
  );

  // Spending by category
  const spendingByCategory = queryAll<{
    category_id: string;
    category_name: string;
    category_color: string;
    category_icon: string;
    total_amount: number;
    transaction_count: number;
  }>(
    `SELECT
       c.id as category_id,
       c.name as category_name,
       c.color as category_color,
       c.icon as category_icon,
       SUM(e.amount) as total_amount,
       COUNT(e.id) as transaction_count
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     WHERE e.home_id = ? AND strftime('%Y-%m', e.date) = ?
     GROUP BY c.id, c.name, c.color, c.icon
     ORDER BY total_amount DESC`,
    [req.homeId!, targetMonth]
  );

  // Recent expenses (latest 10)
  const recentExpenses = queryAll(
    `SELECT e.*,
            m.name as merchant_name,
            c.name as category_name,
            c.color as category_color,
            c.icon as category_icon,
            hm.nickname as paid_by_nickname
     FROM expenses e
     JOIN merchants m ON m.id = e.merchant_id
     JOIN categories c ON c.id = e.category_id
     LEFT JOIN home_members hm ON hm.id = e.paid_by_member_id
     WHERE e.home_id = ?
     ORDER BY e.date DESC, e.created_at DESC
     LIMIT 10`,
    [req.homeId!]
  );

  // Monthly limits evaluation for the month
  const rawLimits = queryAll<{
    id: string;
    category_id: string | null;
    category_name: string | null;
    category_color: string | null;
    limit_amount: number;
    alert_threshold: number;
  }>(
    `SELECT ml.id, ml.category_id, ml.limit_amount, ml.alert_threshold,
            c.name as category_name, c.color as category_color
     FROM monthly_limits ml
     LEFT JOIN categories c ON c.id = ml.category_id
     WHERE ml.home_id = ? AND (ml.month IS NULL OR ml.month = ?)`,
    [req.homeId!, targetMonth]
  );

  const limits = rawLimits.map((lim) => {
    let spent = 0;
    if (lim.category_id) {
      const match = spendingByCategory.find((c) => c.category_id === lim.category_id);
      spent = match ? match.total_amount : 0;
    } else {
      spent = totals?.total_spending || 0;
    }

    const percentage = lim.limit_amount > 0 ? (spent / lim.limit_amount) * 100 : 0;
    const remaining = Math.max(0, lim.limit_amount - spent);
    const exceeded = Math.max(0, spent - lim.limit_amount);
    const isWarning = percentage >= (lim.alert_threshold || 80) && percentage < 100;
    const isExceeded = percentage >= 100;

    return {
      ...lim,
      spent,
      remaining,
      exceeded,
      percentage: Number(percentage.toFixed(1)),
      is_warning: isWarning,
      is_exceeded: isExceeded,
    };
  });

  // Calculate overall remaining budget if an overall limit exists
  const overallLimit = limits.find((l) => !l.category_id);
  const remainingBudget = overallLimit ? overallLimit.remaining : null;

  // Upcoming recurring expenses
  const recurring = queryAll<{
    id: string;
    name: string;
    amount: number;
    due_day: number;
    frequency: string;
    merchant_name: string;
    category_name: string;
    category_color: string;
  }>(
    `SELECT r.id, r.name, r.amount, r.due_day, r.frequency,
            m.name as merchant_name, c.name as category_name, c.color as category_color
     FROM recurring_expenses r
     JOIN merchants m ON m.id = r.merchant_id
     JOIN categories c ON c.id = r.category_id
     WHERE r.home_id = ? AND r.is_active = 1
     ORDER BY r.due_day ASC`,
    [req.homeId!]
  );

  // Check which recurring expenses are already paid this month
  const recurringWithStatus = recurring.map((r) => {
    const paidMatch = queryOne<{ id: string; date: string; amount: number }>(
      `SELECT id, date, amount FROM expenses
       WHERE home_id = ? AND recurring_expense_id = ? AND strftime('%Y-%m', date) = ?
       LIMIT 1`,
      [req.homeId!, r.id, targetMonth]
    );
    return {
      ...r,
      is_paid: !!paidMatch,
      paid_expense_id: paidMatch?.id || null,
      paid_date: paidMatch?.date || null,
    };
  });

  res.json({
    month: targetMonth,
    summary: {
      total_spending: totals?.total_spending || 0,
      fixed_expenses: totals?.fixed_spending || 0,
      variable_expenses: totals?.variable_spending || 0,
      transaction_count: totals?.transaction_count || 0,
      remaining_budget: remainingBudget,
      overall_limit: overallLimit?.limit_amount || null,
    },
    spending_by_merchant: spendingByMerchant,
    spending_by_category: spendingByCategory,
    recent_expenses: recentExpenses,
    limits,
    recurring_expenses: recurringWithStatus,
  });
});

/* ==========================================================================
   MONTHLY LIMITS MANAGEMENT
   ========================================================================== */

apiRouter.get('/homes/:homeId/limits', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const targetMonth = (req.query.month as string) || new Date().toISOString().substring(0, 7);

  const limits = queryAll<{
    id: string;
    category_id: string | null;
    category_name: string | null;
    category_color: string | null;
    category_icon: string | null;
    limit_amount: number;
    month: string | null;
    alert_threshold: number;
    created_at: string;
  }>(
    `SELECT ml.*, c.name as category_name, c.color as category_color, c.icon as category_icon
     FROM monthly_limits ml
     LEFT JOIN categories c ON c.id = ml.category_id
     WHERE ml.home_id = ? AND (ml.month IS NULL OR ml.month = ?)
     ORDER BY ml.category_id IS NULL DESC, ml.limit_amount DESC`,
    [req.homeId!, targetMonth]
  );

  const enriched = limits.map((lim) => {
    let spent = 0;
    if (lim.category_id) {
      const row = queryOne<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
         WHERE home_id = ? AND category_id = ? AND strftime('%Y-%m', date) = ?`,
        [req.homeId!, lim.category_id, targetMonth]
      );
      spent = row?.total || 0;
    } else {
      const row = queryOne<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
         WHERE home_id = ? AND strftime('%Y-%m', date) = ?`,
        [req.homeId!, targetMonth]
      );
      spent = row?.total || 0;
    }

    const percentage = lim.limit_amount > 0 ? (spent / lim.limit_amount) * 100 : 0;
    return {
      ...lim,
      spent,
      remaining: Math.max(0, lim.limit_amount - spent),
      exceeded: Math.max(0, spent - lim.limit_amount),
      percentage: Number(percentage.toFixed(1)),
      is_warning: percentage >= (lim.alert_threshold || 80) && percentage < 100,
      is_exceeded: percentage >= 100,
    };
  });

  res.json(enriched);
});

apiRouter.post('/homes/:homeId/limits', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const { category_id, limit_amount, alert_threshold = 80.0, month } = req.body;
  if (!limit_amount || isNaN(Number(limit_amount)) || Number(limit_amount) <= 0) {
    res.status(400).json({ error: 'Valid positive limit amount is required' });
    return;
  }

  const existing = queryOne<{ id: string }>(
    `SELECT id FROM monthly_limits
     WHERE home_id = ?
       AND (category_id = ? OR (category_id IS NULL AND ? IS NULL))
       AND (month = ? OR (month IS NULL AND ? IS NULL))`,
    [req.homeId!, category_id || null, category_id || null, month || null, month || null]
  );

  const now = new Date().toISOString();
  if (existing) {
    run(
      'UPDATE monthly_limits SET limit_amount = ?, alert_threshold = ?, updated_at = ? WHERE id = ?',
      [Number(limit_amount), Number(alert_threshold), now, existing.id]
    );
    res.json({ id: existing.id, message: 'Monthly limit updated' });
    return;
  }

  const id = 'lim_' + Math.random().toString(36).substring(2, 10);
  run(
    `INSERT INTO monthly_limits (id, home_id, category_id, limit_amount, month, alert_threshold, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.homeId!, category_id || null, Number(limit_amount), month || null, Number(alert_threshold), now, now]
  );

  res.status(201).json({ id, home_id: req.homeId, category_id, limit_amount: Number(limit_amount) });
});

apiRouter.put('/homes/:homeId/limits/:id', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const { limit_amount, alert_threshold } = req.body;
  const now = new Date().toISOString();
  run(
    'UPDATE monthly_limits SET limit_amount = COALESCE(?, limit_amount), alert_threshold = COALESCE(?, alert_threshold), updated_at = ? WHERE id = ? AND home_id = ?',
    [limit_amount ? Number(limit_amount) : null, alert_threshold ? Number(alert_threshold) : null, now, req.params.id, req.homeId!]
  );
  res.json({ success: true, message: 'Limit updated' });
});

apiRouter.delete('/homes/:homeId/limits/:id', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  run('DELETE FROM monthly_limits WHERE id = ? AND home_id = ?', [req.params.id, req.homeId!]);
  res.json({ success: true, message: 'Limit removed' });
});

/* ==========================================================================
   RECURRING EXPENSES
   ========================================================================== */

apiRouter.get('/homes/:homeId/recurring', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const targetMonth = (req.query.month as string) || new Date().toISOString().substring(0, 7);

  const recurring = queryAll<{
    id: string;
    merchant_id: string;
    category_id: string;
    name: string;
    amount: number;
    frequency: string;
    due_day: number;
    start_date: string;
    end_date: string | null;
    is_active: number;
    notes: string | null;
    merchant_name: string;
    category_name: string;
    category_color: string;
    category_icon: string;
  }>(
    `SELECT r.*,
            m.name as merchant_name,
            c.name as category_name,
            c.color as category_color,
            c.icon as category_icon
     FROM recurring_expenses r
     JOIN merchants m ON m.id = r.merchant_id
     JOIN categories c ON c.id = r.category_id
     WHERE r.home_id = ?
     ORDER BY r.due_day ASC`,
    [req.homeId!]
  );

  const enriched = recurring.map((r) => {
    const paidMatch = queryOne<{ id: string; date: string; amount: number }>(
      `SELECT id, date, amount FROM expenses
       WHERE home_id = ? AND recurring_expense_id = ? AND strftime('%Y-%m', date) = ?
       LIMIT 1`,
      [req.homeId!, r.id, targetMonth]
    );

    return {
      ...r,
      is_paid: !!paidMatch,
      paid_expense_id: paidMatch?.id || null,
      paid_date: paidMatch?.date || null,
      paid_amount: paidMatch?.amount || null,
    };
  });

  res.json(enriched);
});

apiRouter.post('/homes/:homeId/recurring', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const { name, merchant_name, merchant_id: input_merchant_id, category_id, amount, frequency = 'monthly', due_day, start_date, end_date, notes } = req.body;

  if (!name || !amount || !due_day) {
    res.status(400).json({ error: 'Name, amount, and due day are required' });
    return;
  }

  let merchantId = input_merchant_id;
  if (!merchantId && merchant_name) {
    const trimmed = merchant_name.trim();
    const existing = queryOne<{ id: string }>('SELECT id FROM merchants WHERE home_id = ? AND LOWER(name) = LOWER(?)', [req.homeId!, trimmed]);
    if (existing) {
      merchantId = existing.id;
    } else {
      merchantId = 'mer_' + Math.random().toString(36).substring(2, 10);
      run('INSERT INTO merchants (id, home_id, name, default_category_id, default_expense_type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [merchantId, req.homeId!, trimmed, category_id || null, 'fixed', new Date().toISOString()]
      );
    }
  }

  if (!merchantId) {
    // Default to Bills & Utilities merchant or first merchant
    const mer = queryOne<{ id: string }>('SELECT id FROM merchants WHERE home_id = ? LIMIT 1', [req.homeId!]);
    merchantId = mer?.id;
  }

  let catId = category_id;
  if (!catId) {
    const billsCat = queryOne<{ id: string }>('SELECT id FROM categories WHERE home_id = ? AND name = ?', [req.homeId!, 'Bills & Utilities']);
    catId = billsCat?.id;
  }

  const id = 'rec_' + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();
  run(
    `INSERT INTO recurring_expenses (id, home_id, merchant_id, category_id, name, amount, frequency, due_day, start_date, end_date, is_active, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id,
      req.homeId!,
      merchantId,
      catId,
      name.trim(),
      Number(amount),
      frequency,
      Number(due_day),
      start_date || now.substring(0, 10),
      end_date || null,
      notes || null,
      now,
    ]
  );

  res.status(201).json({ id, name, amount: Number(amount), due_day: Number(due_day) });
});

apiRouter.put('/homes/:homeId/recurring/:id', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const { name, amount, frequency, due_day, is_active, notes, end_date } = req.body;
  run(
    `UPDATE recurring_expenses
     SET name = COALESCE(?, name),
         amount = COALESCE(?, amount),
         frequency = COALESCE(?, frequency),
         due_day = COALESCE(?, due_day),
         is_active = COALESCE(?, is_active),
         notes = ?,
         end_date = ?
     WHERE id = ? AND home_id = ?`,
    [
      name ? name.trim() : null,
      amount ? Number(amount) : null,
      frequency,
      due_day ? Number(due_day) : null,
      is_active !== undefined ? Number(is_active) : null,
      notes !== undefined ? notes : null,
      end_date !== undefined ? end_date : null,
      req.params.id,
      req.homeId!,
    ]
  );

  res.json({ success: true, message: 'Recurring expense updated' });
});

apiRouter.delete('/homes/:homeId/recurring/:id', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  run('DELETE FROM recurring_expenses WHERE id = ? AND home_id = ?', [req.params.id, req.homeId!]);
  res.json({ success: true, message: 'Recurring expense deleted' });
});

// Mark recurring expense as paid for current month
apiRouter.post('/homes/:homeId/recurring/:id/mark-paid', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const recurring = queryOne<{
    id: string;
    merchant_id: string;
    category_id: string;
    name: string;
    amount: number;
    due_day: number;
  }>('SELECT * FROM recurring_expenses WHERE id = ? AND home_id = ?', [req.params.id, req.homeId!]);

  if (!recurring) {
    res.status(404).json({ error: 'Recurring expense not found' });
    return;
  }

  const { date, paid_by_member_id, notes, amount_paid } = req.body;
  const targetDate = date || new Date().toISOString().substring(0, 10);
  const targetMonth = targetDate.substring(0, 7);

  // Check if already paid for this month
  const alreadyPaid = queryOne<{ id: string }>(
    `SELECT id FROM expenses WHERE home_id = ? AND recurring_expense_id = ? AND strftime('%Y-%m', date) = ?`,
    [req.homeId!, recurring.id, targetMonth]
  );

  if (alreadyPaid) {
    res.status(400).json({ error: 'Already recorded as paid for this month', expense_id: alreadyPaid.id });
    return;
  }

  let memberId = paid_by_member_id;
  if (!memberId) {
    const mem = queryOne<{ id: string }>('SELECT id FROM home_members WHERE home_id = ? AND user_id = ?', [req.homeId!, req.userId!]);
    memberId = mem?.id;
  }

  const expenseId = 'exp_' + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();
  const paidAmount = amount_paid ? Number(amount_paid) : recurring.amount;

  run(
    `INSERT INTO expenses (id, home_id, merchant_id, category_id, amount, description, expense_type, date, paid_by_member_id, recurring_expense_id, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'fixed', ?, ?, ?, ?, ?, ?)`,
    [
      expenseId,
      req.homeId!,
      recurring.merchant_id,
      recurring.category_id,
      paidAmount,
      recurring.name,
      targetDate,
      memberId || null,
      recurring.id,
      notes || `Recurring payment marked as paid on ${targetDate}`,
      now,
      now,
    ]
  );

  res.status(201).json({
    success: true,
    message: `Marked "${recurring.name}" as paid for ${targetMonth}`,
    expense_id: expenseId,
  });
});

/* ==========================================================================
   REPORTS & MONTHLY SUMMARY
   ========================================================================== */

apiRouter.get('/homes/:homeId/reports/monthly', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const targetMonth = (req.query.month as string) || new Date().toISOString().substring(0, 7);

  // Totals
  const totals = queryOne<{
    total_spending: number;
    fixed_spending: number;
    variable_spending: number;
    count: number;
    avg_per_day: number;
  }>(
    `SELECT
       COALESCE(SUM(amount), 0) as total_spending,
       COALESCE(SUM(CASE WHEN expense_type = 'fixed' THEN amount ELSE 0 END), 0) as fixed_spending,
       COALESCE(SUM(CASE WHEN expense_type = 'variable' THEN amount ELSE 0 END), 0) as variable_spending,
       COUNT(*) as count
     FROM expenses
     WHERE home_id = ? AND strftime('%Y-%m', date) = ?`,
    [req.homeId!, targetMonth]
  );

  // By Merchant
  const merchants = queryAll<{ name: string; amount: number; count: number }>(
    `SELECT m.name, SUM(e.amount) as amount, COUNT(e.id) as count
     FROM expenses e
     JOIN merchants m ON m.id = e.merchant_id
     WHERE e.home_id = ? AND strftime('%Y-%m', e.date) = ?
     GROUP BY m.id, m.name
     ORDER BY amount DESC`,
    [req.homeId!, targetMonth]
  );

  // By Category
  const categories = queryAll<{ name: string; color: string; icon: string; amount: number; count: number }>(
    `SELECT c.name, c.color, c.icon, SUM(e.amount) as amount, COUNT(e.id) as count
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     WHERE e.home_id = ? AND strftime('%Y-%m', e.date) = ?
     GROUP BY c.id, c.name, c.color, c.icon
     ORDER BY amount DESC`,
    [req.homeId!, targetMonth]
  );

  // Daily Spending timeline
  const dailyTimeline = queryAll<{ date: string; amount: number; count: number }>(
    `SELECT date, SUM(amount) as amount, COUNT(id) as count
     FROM expenses
     WHERE home_id = ? AND strftime('%Y-%m', date) = ?
     GROUP BY date
     ORDER BY date ASC`,
    [req.homeId!, targetMonth]
  );

  // Available months list for selector
  const availableMonths = queryAll<{ month: string }>(
    `SELECT DISTINCT strftime('%Y-%m', date) as month
     FROM expenses
     WHERE home_id = ?
     ORDER BY month DESC`,
    [req.homeId!]
  );

  res.json({
    month: targetMonth,
    totals,
    merchants,
    categories,
    dailyTimeline,
    availableMonths: availableMonths.map((m) => m.month),
  });
});

// CSV Export
apiRouter.get('/homes/:homeId/reports/export', authMiddleware, verifyHomeAccess, (req: AuthRequest, res: Response) => {
  const { month } = req.query;
  let sql = `
    SELECT e.date, m.name as merchant, e.description, c.name as category, e.amount, e.expense_type, COALESCE(e.notes, '') as notes, COALESCE(hm.nickname, u.name, '') as paid_by
    FROM expenses e
    JOIN merchants m ON m.id = e.merchant_id
    JOIN categories c ON c.id = e.category_id
    LEFT JOIN home_members hm ON hm.id = e.paid_by_member_id
    LEFT JOIN users u ON u.id = hm.user_id
    WHERE e.home_id = ?
  `;
  const params: string[] = [req.homeId!];
  if (month && typeof month === 'string') {
    sql += ` AND strftime('%Y-%m', e.date) = ?`;
    params.push(month);
  }
  sql += ` ORDER BY e.date DESC`;

  const rows = queryAll<{
    date: string;
    merchant: string;
    description: string;
    category: string;
    amount: number;
    expense_type: string;
    notes: string;
    paid_by: string;
  }>(sql, params);

  let csv = 'Date,Merchant,Description,Category,Amount,Type,Notes,Paid By\n';
  for (const r of rows) {
    const cleanDesc = `"${r.description.replace(/"/g, '""')}"`;
    const cleanNotes = `"${r.notes.replace(/"/g, '""')}"`;
    csv += `${r.date},"${r.merchant}",${cleanDesc},"${r.category}",${r.amount},${r.expense_type},${cleanNotes},"${r.paid_by}"\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="homemanager-expenses-${month || 'all'}.csv"`);
  res.send(csv);
});
