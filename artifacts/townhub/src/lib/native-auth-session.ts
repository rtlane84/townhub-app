/**
 * JS bridge for TownHub native OAuth.
 * Lives in the app package so Vite can resolve `@capacitor/core` (workspace
 * peer deps are not visible to Rollup from linked packages).
 */
import { registerPlugin } from "@capacitor/core";

export interface OpenAuthSessionOptions {
  url: string;
  callbackScheme: string;
  prefersEphemeralSession?: boolean;
}

export interface OpenAuthSessionResult {
  url: string;
}

export interface AppleSignInOptions {
  /** Optional SHA-256 nonce embedded in the Apple identity token. */
  nonce?: string;
}

export interface AppleSignInResult {
  /** Apple identity token (JWT) — exchanged with Clerk via `oauth_token_apple`. */
  identityToken: string;
  authorizationCode?: string;
  user?: string;
  email?: string;
  givenName?: string;
  familyName?: string;
}

export interface GoogleSignInOptions {
  /** iOS OAuth client ID (`….apps.googleusercontent.com`). */
  clientId: string;
  /** Web OAuth client ID — becomes the ID token `aud` Clerk verifies. */
  serverClientId?: string;
}

export interface GoogleSignInResult {
  /** Google ID token (JWT) — exchanged with Clerk via google_one_tap. */
  idToken: string;
  email?: string;
  name?: string;
}

export interface ClerkClientTokenResult {
  token: string | null;
}

export interface AuthSessionPlugin {
  openAuthSession(options: OpenAuthSessionOptions): Promise<OpenAuthSessionResult>;
  appleSignIn(options?: AppleSignInOptions): Promise<AppleSignInResult>;
  googleSignIn(options: GoogleSignInOptions): Promise<GoogleSignInResult>;
  getClerkClientToken(): Promise<ClerkClientTokenResult>;
  saveClerkClientToken(options: { token: string }): Promise<void>;
  clearClerkClientToken(): Promise<void>;
}

export const AuthSession = registerPlugin<AuthSessionPlugin>("AuthSession", {
  web: () => ({
    openAuthSession: async () => {
      throw new Error("AuthSession.openAuthSession is only available in the native app.");
    },
    appleSignIn: async () => {
      throw new Error("AuthSession.appleSignIn is only available in the native app.");
    },
    googleSignIn: async () => {
      throw new Error("AuthSession.googleSignIn is only available in the native app.");
    },
    getClerkClientToken: async () => ({ token: null }),
    saveClerkClientToken: async () => undefined,
    clearClerkClientToken: async () => undefined,
  }),
});
