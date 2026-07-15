import Foundation
import AuthenticationServices
import Capacitor

/**
 * Opens an OAuth URL with ASWebAuthenticationSession and resolves with the
 * full callback URL (including query / path-encoded Clerk params).
 *
 * Cap Browser (SFSafariViewController) cannot reliably return custom-scheme
 * OAuth redirects; Apple's auth page often stalls blank. This is the
 * Expo/Clerk-style auth-session primitive.
 */
@objc(AuthSessionPlugin)
public class AuthSessionPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "AuthSessionPlugin"
    public let jsName = "AuthSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openAuthSession", returnType: CAPPluginReturnPromise)
    ]

    private var session: ASWebAuthenticationSession?
    private var retainedSelf: AuthSessionPlugin?

    @objc func openAuthSession(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"), let url = URL(string: urlString) else {
            call.reject("Must provide a valid url")
            return
        }
        let scheme = call.getString("callbackScheme") ?? "townhub"
        let ephemeral = call.getBool("prefersEphemeralSession") ?? false

        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.reject("AuthSession plugin released")
                return
            }

            // Keep the plugin alive until the session completes.
            self.retainedSelf = self

            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { [weak self] callbackURL, error in
                defer {
                    self?.session = nil
                    self?.retainedSelf = nil
                }

                if let error = error as? ASWebAuthenticationSessionError {
                    if error.code == .canceledLogin {
                        call.reject("User cancelled sign-in", "AUTH_CANCELLED")
                        return
                    }
                    call.reject(error.localizedDescription, "AUTH_FAILED")
                    return
                }
                if let error = error {
                    call.reject(error.localizedDescription, "AUTH_FAILED")
                    return
                }
                guard let callbackURL = callbackURL else {
                    call.reject("Sign-in returned no callback URL", "AUTH_NO_CALLBACK")
                    return
                }
                call.resolve(["url": callbackURL.absoluteString])
            }

            session.prefersEphemeralWebBrowserSession = ephemeral
            session.presentationContextProvider = self
            self.session = session

            if !session.start() {
                self.session = nil
                self.retainedSelf = nil
                call.reject("Failed to start authentication session", "AUTH_START_FAILED")
            }
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        if let window = bridge?.viewController?.view.window {
            return window
        }
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        if let key = scenes.flatMap({ $0.windows }).first(where: { $0.isKeyWindow }) {
            return key
        }
        return scenes.flatMap({ $0.windows }).first ?? ASPresentationAnchor()
    }
}
