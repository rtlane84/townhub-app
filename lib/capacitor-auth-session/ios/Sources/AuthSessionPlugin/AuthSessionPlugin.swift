import Foundation
import AuthenticationServices
import Capacitor
import GoogleSignIn

/**
 * Native auth helpers for TownHub Capacitor:
 * - ASWebAuthenticationSession (legacy browser OAuth; kept for fallbacks)
 * - Sign in with Apple (ASAuthorization → Clerk oauth_token_apple)
 * - Google Sign-In (GIDSignIn → Clerk google_one_tap / authenticateWithGoogleOneTap)
 */
@objc(AuthSessionPlugin)
public class AuthSessionPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "AuthSessionPlugin"
    public let jsName = "AuthSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openAuthSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "appleSignIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "googleSignIn", returnType: CAPPluginReturnPromise)
    ]

    private var session: ASWebAuthenticationSession?
    private var retainedSelf: AuthSessionPlugin?
    private var appleSignInCall: CAPPluginCall?

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
        return resolvePresentationAnchor()
    }

    // MARK: - Native Sign in with Apple (ASAuthorization)

    /// Presents Apple's native sign-in sheet and resolves with the identity token
    /// (a JWT) that Clerk verifies via the `oauth_token_apple` strategy. No browser
    /// or redirect is involved, so the `capacitor://` scheme limitation does not apply.
    @objc func appleSignIn(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.reject("AuthSession plugin released")
                return
            }
            self.appleSignInCall = call

            let provider = ASAuthorizationAppleIDProvider()
            let request = provider.createRequest()
            request.requestedScopes = [.fullName, .email]
            if let nonce = call.getString("nonce"), !nonce.isEmpty {
                request.nonce = nonce
            }

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let call = appleSignInCall else { return }
        defer { appleSignInCall = nil }

        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let tokenData = credential.identityToken,
            let identityToken = String(data: tokenData, encoding: .utf8)
        else {
            call.reject("Apple sign-in returned no identity token", "AUTH_NO_TOKEN")
            return
        }

        var result: [String: Any] = ["identityToken": identityToken]
        if let codeData = credential.authorizationCode,
           let code = String(data: codeData, encoding: .utf8) {
            result["authorizationCode"] = code
        }
        result["user"] = credential.user
        if let email = credential.email {
            result["email"] = email
        }
        if let fullName = credential.fullName {
            if let given = fullName.givenName { result["givenName"] = given }
            if let family = fullName.familyName { result["familyName"] = family }
        }
        call.resolve(result)
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        guard let call = appleSignInCall else { return }
        defer { appleSignInCall = nil }

        if let authError = error as? ASAuthorizationError, authError.code == .canceled {
            call.reject("User cancelled sign-in", "AUTH_CANCELLED")
            return
        }
        call.reject(error.localizedDescription, "AUTH_FAILED")
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return resolvePresentationAnchor()
    }

    // MARK: - Native Google Sign-In (GIDSignIn)

    /// Presents Google's native sign-in UI and resolves with an ID token that
    /// Clerk verifies via `google_one_tap` / `authenticateWithGoogleOneTap`.
    /// Requires `clientId` (iOS OAuth client) and `serverClientId` (Web client —
    /// the audience Clerk expects on the ID token).
    @objc func googleSignIn(_ call: CAPPluginCall) {
        guard let clientId = call.getString("clientId"), !clientId.isEmpty else {
            call.reject("Google Sign-In requires clientId (iOS OAuth client)", "AUTH_CONFIG")
            return
        }
        let serverClientId = call.getString("serverClientId")

        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.reject("AuthSession plugin released")
                return
            }
            guard let presenting = self.bridge?.viewController else {
                call.reject("No presenting view controller for Google Sign-In", "AUTH_NO_PRESENTER")
                return
            }

            let config: GIDConfiguration
            if let serverClientId = serverClientId, !serverClientId.isEmpty {
                config = GIDConfiguration(clientID: clientId, serverClientID: serverClientId)
            } else {
                config = GIDConfiguration(clientID: clientId)
            }
            GIDSignIn.sharedInstance.configuration = config

            GIDSignIn.sharedInstance.signIn(withPresenting: presenting) { result, error in
                if let error = error as NSError? {
                    // Google Sign-In cancel code is -5 (kGIDSignInErrorCodeCanceled).
                    if error.code == -5 {
                        call.reject("User cancelled sign-in", "AUTH_CANCELLED")
                        return
                    }
                    call.reject(error.localizedDescription, "AUTH_FAILED")
                    return
                }
                guard
                    let user = result?.user,
                    let idToken = user.idToken?.tokenString,
                    !idToken.isEmpty
                else {
                    call.reject("Google Sign-In returned no ID token", "AUTH_NO_TOKEN")
                    return
                }

                var payload: [String: Any] = ["idToken": idToken]
                if let email = user.profile?.email {
                    payload["email"] = email
                }
                if let name = user.profile?.name {
                    payload["name"] = name
                }
                call.resolve(payload)
            }
        }
    }

    private func resolvePresentationAnchor() -> ASPresentationAnchor {
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
