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

export interface AuthSessionPlugin {
  openAuthSession(options: OpenAuthSessionOptions): Promise<OpenAuthSessionResult>;
}

export const AuthSession = registerPlugin<AuthSessionPlugin>("AuthSession", {
  web: () => ({
    openAuthSession: async () => {
      throw new Error("AuthSession.openAuthSession is only available in the native app.");
    },
  }),
});
