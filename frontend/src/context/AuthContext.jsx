import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { sha3_256 } from "js-sha3";
import {
  finalizeCertificateLogin,
  finalizeQrLogin,
  fetchServerSession,
  requestCertificateChallenge,
  requestQrChallenge,
} from "../services/authService";
import {
  ensurePlatformKey,
  signWithPlatformKey,
  importPrivateKeyFromPem,
  enrollPlatformKey,
  getStoredDeviceSecret,
} from "../utils/platformKeystore";

const AuthContext = createContext();

/**
 * AuthProvider
 * - Handles certificate based authentication
 * - Stores auth state and user info
 */
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [certificateReady, setCertificateReady] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);

  const resetAuthState = useCallback(() => {
    localStorage.removeItem("pq_token");
    localStorage.removeItem("pq_user");
    setUser(null);
    setIsAuthenticated(false);
    setSessionInfo(null);
    setCertificateReady(false);
    setIsVerifyingSession(false);
  }, []);

  const syncSessionFromServer = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setIsVerifyingSession(true);
      }

      try {
        const token = localStorage.getItem("pq_token");
        if (!token) {
          resetAuthState();
          return null;
        }

        const response = await fetchServerSession();
        const sessionUser = response.user;
        if (!sessionUser) {
          resetAuthState();
          return null;
        }

        localStorage.setItem("pq_user", JSON.stringify(sessionUser));
        setUser(sessionUser);
        setIsAuthenticated(true);
        setSessionInfo(response);
        const ready =
          Boolean(response.certificate?.certificate_id) &&
          !response.session?.reauth_required;
        setCertificateReady(ready);
        return response;
      } catch (error) {
        resetAuthState();
        throw error;
      } finally {
        if (!silent) {
          setIsVerifyingSession(false);
        }
      }
    },
    [resetAuthState],
  );

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await syncSessionFromServer();
      } catch (error) {
        console.warn("Unable to synchronize session", error);
      }
    };

    bootstrap();
  }, [syncSessionFromServer]);

  const decodeBase64 = (value) => {
    if (typeof atob === "function") {
      return atob(value);
    }
    throw new Error("Base64 decoder unavailable in this environment");
  };

  const base64ToUint8Array = (value) => {
    const binary = decodeBase64(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const readFileAsText = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () =>
        reject(reader.error || new Error("Unable to read certificate"));
      reader.readAsText(file);
    });

  const parseCertificateText = (text) => {
    const payload = {};
    text.split(/\r?\n/).forEach((line) => {
      if (!line || !line.includes("=")) {
        return;
      }
      const [key, ...rest] = line.split("=");
      if (!key || rest.length === 0) {
        return;
      }
      payload[key.trim()] = rest.join("=").trim();
    });
    return payload;
  };

  const bufferToHex = (buffer) =>
    Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  const deriveDeviceIdLegacy = async (deviceSecret) => {
    const encoder = new TextEncoder();
    const secretBytes = encoder.encode(deviceSecret);
    const digest = await window.crypto.subtle.digest("SHA-256", secretBytes);
    return bufferToHex(digest);
  };

  const buildChallengeMessage = (nonceB64, deviceId) => {
    const nonceBytes = base64ToUint8Array(nonceB64);
    const deviceIdBytes = new TextEncoder().encode(deviceId);
    const message = new Uint8Array(nonceBytes.length + deviceIdBytes.length);
    message.set(nonceBytes, 0);
    message.set(deviceIdBytes, nonceBytes.length);
    return message;
  };

  const computeDeviceProof = (deviceSecret, nonceB64) => {
    const encoder = new TextEncoder();
    const secretBytes = encoder.encode(deviceSecret);
    const nonceBytes = base64ToUint8Array(nonceB64);
    const combined = new Uint8Array(secretBytes.length + nonceBytes.length);
    combined.set(secretBytes, 0);
    combined.set(nonceBytes, secretBytes.length);
    return sha3_256(combined);
  };

  const requireStoredDeviceSecret = async (
    certificateId,
    fallbackSecret = "",
  ) => {
    const normalizedFallback = (fallbackSecret || "").trim();
    if (normalizedFallback) {
      return normalizedFallback;
    }

    const resolved = await getStoredDeviceSecret(certificateId);
    const normalized = (resolved || "").trim();
    if (!normalized) {
      throw new Error(
        "Device not registered. Click 'Need to re-enroll secure keys?' below and provide your private key (.pem) and device secret to complete re-enrollment.",
      );
    }
    return normalized;
  };

  /**
   * Login using digital certificate + device secret challenge
   * @param {File} certificateFile (.pem)
   */
  const loginWithCertificate = async ({
    certificateFile,
    privateKeyFile = null,
    manualDeviceSecret = "",
  }) => {
    if (!certificateFile) {
      throw new Error("Certificate file required");
    }

    try {
      console.log("[AUTH] Starting certificate login process");
      console.log("[AUTH] Reading certificate file:", certificateFile.name);
      const certificateText = await readFileAsText(certificateFile);
      const certificateData = parseCertificateText(certificateText);
      let certificateId =
        certificateData.certificate_id || certificateData.user_id || "";

      if (!certificateId) {
        const normalizedName = (certificateFile.name || "").trim();
        if (normalizedName) {
          const withoutExt = normalizedName.replace(/\.pem$/i, "");
          certificateId = withoutExt.includes("_")
            ? withoutExt.split("_")[0]
            : withoutExt;
        }
      }
      const storedDeviceId = (certificateData.device_id || "").trim();

      if (!certificateId) {
        throw new Error("Certificate missing certificate_id field");
      }

      console.log("[AUTH] Certificate ID:", certificateId);
      console.log("[AUTH] Has private key file:", !!privateKeyFile);
      console.log("[AUTH] Has manual device secret:", !!manualDeviceSecret.trim());

      const normalizedDeviceSecret = await requireStoredDeviceSecret(
        certificateId,
        manualDeviceSecret,
      );
      console.log("[AUTH] Device secret resolved successfully");

      let derivedDeviceId = storedDeviceId;
      if (!derivedDeviceId) {
        derivedDeviceId = await deriveDeviceIdLegacy(normalizedDeviceSecret);
      }
      console.log("[AUTH] Device ID:", derivedDeviceId);

      if (!derivedDeviceId) {
        throw new Error("Unable to determine the device binding identifier");
      }

      if (storedDeviceId && storedDeviceId !== derivedDeviceId) {
        throw new Error(
          "Secure device binding mismatch detected for this certificate",
        );
      }

      console.log("[AUTH] Requesting challenge from backend");
      const challenge = await requestCertificateChallenge({
        certificateId,
        deviceId: derivedDeviceId,
      });
      console.log("[AUTH] Challenge received:", challenge.challenge_token);

      const bindingMode = (
        challenge.binding_mode || "device_secret"
      ).toLowerCase();
      if (bindingMode !== "device_secret") {
        throw new Error("Unsupported certificate binding mode");
      }

      if (privateKeyFile) {
        console.log("[AUTH] Importing private key from file");
        try {
          const privateKeyPem = await readFileAsText(privateKeyFile);
          const privateKeyObject = await importPrivateKeyFromPem(privateKeyPem);
          await enrollPlatformKey(certificateId, privateKeyObject, {
            deviceSecret: normalizedDeviceSecret,
          });
          console.log("[AUTH] Private key enrolled successfully");
        } catch (importError) {
          console.error("Private key import failed", importError);
          throw new Error(
            importError.message ||
              "Unable to import private key for this certificate.",
          );
        }
      }

      try {
        console.log("[AUTH] Ensuring platform key for certificate:", certificateId);
        await ensurePlatformKey(certificateId);
        console.log("[AUTH] Platform key verified successfully");
      } catch (keystoreError) {
        console.error("[AUTH] Platform key verification failed:", keystoreError);
        if (privateKeyFile) {
          throw new Error(
            "Key enrollment failed after importing private key. Please reload the page and try again.",
          );
        }

        console.error("Secure key enrollment missing", keystoreError);
        throw new Error(
          "Private key not found in browser. Click 'Need to re-enroll secure keys?' below and provide your private key (.pem) file to continue.",
        );
      }

      console.log("[AUTH] Building challenge message with nonce and device ID");
      const message = buildChallengeMessage(challenge.nonce, derivedDeviceId);
      
      console.log("[AUTH] Signing challenge with platform key");
      const rsaSignature = await signWithPlatformKey(certificateId, message);
      console.log("[AUTH] RSA signature generated successfully");
      
      const pqSignature = null; // TODO: integrate Dilithium signer in browser
      
      console.log("[AUTH] Computing device proof");
      const deviceProof = computeDeviceProof(
        normalizedDeviceSecret,
        challenge.nonce,
      );
      console.log("[AUTH] Device proof computed successfully");

      console.log("[AUTH] Finalizing certificate login with backend");
      const session = await finalizeCertificateLogin({
        challengeToken: challenge.challenge_token,
        deviceId: derivedDeviceId,
        deviceProof,
        rsaSignature,
        pqSignature,
      });
      console.log("[AUTH] Backend login successful");

      const { token, user } = session;

      localStorage.setItem("pq_token", token);
      localStorage.setItem("pq_user", JSON.stringify(user));

      setUser(user);
      setIsAuthenticated(true);
      setCertificateReady(true);

      try {
        await syncSessionFromServer({ silent: true });
      } catch (syncError) {
        console.warn("Post-login session sync failed", syncError);
      }

      return user;
    } catch (error) {
      console.error("Certificate login failed:", error);
      throw error;
    } finally {
      // no-op; component level loaders handle UX
    }
  };

  const loginWithQrCode = async ({
    certificateId,
    certHash,
    privateKeyFile = null,
  }) => {
    const normalizedCertificateId = (certificateId || "").trim();
    const normalizedCertHash = (certHash || "").trim();

    if (!normalizedCertificateId || !normalizedCertHash) {
      throw new Error("QR payload missing certificate reference");
    }

    const challenge = await requestQrChallenge({
      certificateId: normalizedCertificateId,
      certHash: normalizedCertHash,
    });

    try {
      await ensurePlatformKey(normalizedCertificateId);
    } catch (keystoreError) {
      if (!privateKeyFile) {
        throw new Error(
          keystoreError.message ||
            "Secure key material missing. Provide the matching private key to re-enroll.",
        );
      }
      const privateKeyPem = await readFileAsText(privateKeyFile);
      const privateKeyObject = await importPrivateKeyFromPem(privateKeyPem);
      await enrollPlatformKey(normalizedCertificateId, privateKeyObject);
    }

    const bindingMode = (
      challenge.binding_mode || "device_secret"
    ).toLowerCase();
    if (bindingMode !== "device_secret") {
      throw new Error("Unsupported QR binding mode");
    }

    if (!challenge.device_id) {
      throw new Error("QR challenge missing device binding");
    }

    const normalizedDeviceSecret = await requireStoredDeviceSecret(
      normalizedCertificateId,
    );
    const derivedDeviceId = await deriveDeviceIdLegacy(normalizedDeviceSecret);
    if (challenge.device_id !== derivedDeviceId) {
      throw new Error("Device secret does not match this ID card");
    }

    const deviceProof = computeDeviceProof(
      normalizedDeviceSecret,
      challenge.nonce,
    );

    const message = buildChallengeMessage(challenge.nonce, derivedDeviceId);
    const rsaSignature = await signWithPlatformKey(
      normalizedCertificateId,
      message,
    );
    const pqSignature = null;

    const session = await finalizeQrLogin({
      challengeToken: challenge.challenge_token,
      deviceId: derivedDeviceId,
      rsaSignature,
      pqSignature,
      deviceProof,
    });

    const { token, user: sessionUser } = session;
    localStorage.setItem("pq_token", token);
    localStorage.setItem("pq_user", JSON.stringify(sessionUser));
    setUser(sessionUser);
    setIsAuthenticated(true);
    setCertificateReady(true);

    try {
      await syncSessionFromServer({ silent: true });
    } catch (syncError) {
      console.warn("Post-QR login sync failed", syncError);
    }

    return sessionUser;
  };

  /**
   * Logout
   */
  const logout = () => {
    resetAuthState();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        sessionInfo,
        certificateReady,
        isVerifyingSession,
        refreshSession: syncSessionFromServer,
        loginWithCertificate,
        loginWithQrCode,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook
 */
export const useAuth = () => useContext(AuthContext);
