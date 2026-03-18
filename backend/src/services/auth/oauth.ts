import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import prisma from '../../config/database';
import { generateTokens, UserRole } from './jwt';

export function getPrismaInstance() {
  return prisma;
}

// For testing purposes
export function setPrismaInstance(_instance: any): void {
  // Not needed if using singleton
}

export interface OAuthRedirectURL {
  url: string;
}



/**
 * Configure Passport.js with Google OAuth strategy
 */
export function configurePassport(): void {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL;

  if (!clientID || !clientSecret || !callbackURL) {
    throw new Error('Google OAuth credentials not configured');
  }

  const prisma = getPrismaInstance();

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        scope: ['profile', 'email'],
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyCallback
      ) => {
        try {
          // Extract email from profile
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          // Check if user exists
          let user = await prisma.user.findUnique({
            where: { email },
          });

          // If user doesn't exist, create a new one
          // Note: For OAuth, we need to determine the role based on email domain or other logic
          // For now, we'll default to STUDENT role for new OAuth users
          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                role: 'STUDENT', // Default role for OAuth users
                // passwordHash is null for OAuth users
              },
            });
          }

          // Return user data
          done(null, {
            id: user.id,
            email: user.email,
            role: user.role as UserRole,
          });
        } catch (error) {
          done(error as Error, undefined);
        }
      }
    )
  );

  // Serialize user for session (not used in JWT-based auth, but required by Passport)
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session (not used in JWT-based auth, but required by Passport)
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}

/**
 * Initiate Google OAuth authentication flow
 * @returns OAuthRedirectURL containing the Google OAuth URL
 */
export function initiateGoogleOAuth(): OAuthRedirectURL {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL;

  if (!clientID || !callbackURL) {
    throw new Error('Google OAuth credentials not configured');
  }

  // Construct Google OAuth URL
  const scope = encodeURIComponent('profile email');
  const redirectUri = encodeURIComponent(callbackURL);
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

  return { url };
}

export interface AuthResult {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    name?: string;
  };
  accessToken?: string;
  refreshToken?: string;
  needsProfile?: boolean;
  profile?: {
    email: string;
    name?: string;
  };
}

/**
 * Handle Google OAuth callback and generate tokens
 * @param code - Authorization code from Google
 * @returns AuthResult with user data and tokens or needsProfile flag
 */
export async function handleGoogleCallback(code: string): Promise<AuthResult> {
  if (!code) {
    throw new Error('Authorization code is required');
  }

  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL;

  if (!clientID || !clientSecret || !callbackURL) {
    throw new Error('Google OAuth credentials not configured');
  }

  const prisma = getPrismaInstance();

  try {
    // Exchange authorization code for access token using axios for better error handling
    const axios = (await import('axios')).default;
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
      code,
      client_id: clientID,
      client_secret: clientSecret,
      redirect_uri: callbackURL,
      grant_type: 'authorization_code',
    }).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const accessToken = tokenResponse.data.access_token;

    // Get user profile from Google
    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const profile = profileResponse.data as {
      email: string;
      name?: string;
    };
    const email = profile.email;
    const name = profile.name;

    if (!email) {
      throw new Error('No email found in Google profile');
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        student: { select: { name: true } },
        teacher: { select: { name: true } },
        parent: { select: { name: true } },
        admin: { select: { name: true } },
      },
    });

    // If user doesn't exist, tell the frontend to complete the profile
    if (!user) {
      return {
        needsProfile: true,
        profile: {
          email,
          name: name || undefined,
        }
      };
    }

    // Get name from profile if available
    const profileName = user.student?.name || user.teacher?.name || user.parent?.name || user.admin?.name || name;

    // Generate JWT tokens
    const tokens = generateTokens(user.id, user.role as UserRole, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
        name: profileName || undefined,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OAuth callback failed: ${error.message}`);
    }
    throw new Error('OAuth callback failed');
  }
}
