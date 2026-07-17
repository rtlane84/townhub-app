package com.lanetech.townhub.authsession;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Android stub. iOS App Store beta uses ASWebAuthenticationSession.
 * Native Android OAuth should use Custom Tabs + intent filters when Android ships.
 */
@CapacitorPlugin(name = "AuthSession")
public class AuthSessionPlugin extends Plugin {
    @PluginMethod
    public void openAuthSession(PluginCall call) {
        call.reject("AuthSession.openAuthSession is not implemented on Android yet", "AUTH_UNSUPPORTED");
    }

    @PluginMethod
    public void getClerkClientToken(PluginCall call) {
        call.reject("Clerk token storage is not implemented on Android yet", "AUTH_UNSUPPORTED");
    }

    @PluginMethod
    public void saveClerkClientToken(PluginCall call) {
        call.reject("Clerk token storage is not implemented on Android yet", "AUTH_UNSUPPORTED");
    }

    @PluginMethod
    public void clearClerkClientToken(PluginCall call) {
        call.reject("Clerk token storage is not implemented on Android yet", "AUTH_UNSUPPORTED");
    }
}
