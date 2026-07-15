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

export declare const AuthSession: AuthSessionPlugin;
