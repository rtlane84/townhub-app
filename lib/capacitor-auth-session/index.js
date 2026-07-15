import { registerPlugin } from "@capacitor/core";

export const AuthSession = registerPlugin("AuthSession", {
  web: () => ({
    openAuthSession: async () => {
      throw new Error("AuthSession.openAuthSession is only available in the native app.");
    },
  }),
});
