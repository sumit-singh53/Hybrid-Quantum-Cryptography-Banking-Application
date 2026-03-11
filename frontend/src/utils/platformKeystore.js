const DB_NAME = "pqPlatformKeystore";
const STORE_NAME = "deviceKeys";
const DB_VERSION = 2;

const KEY_USAGE = ["sign", "verify"];
const PRIVATE_KEY_IMPORT_USAGE = ["sign"];
const KEY_GEN_PARAMS = {
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 3072,
    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
    hash: { name: "SHA-256" },
};
const DEVICE_SECRET_LABEL = "device_secret";
const DEVICE_SECRET_KEY_SPEC = { name: "AES-GCM", length: 256 };
const DEVICE_SECRET_KEY_USAGE = ["encrypt", "decrypt"];
const DEVICE_SECRET_IV_BYTES = 12;
const DEVICE_SECRET_VERSION = 1;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const ensureSecureContext = () => {
    if (typeof window === "undefined" || typeof indexedDB === "undefined") {
        throw new Error("Secure storage unavailable in this environment");
    }
    if (!window.isSecureContext) {
        throw new Error("Hardware-backed key storage requires HTTPS / secure context");
    }
};

const getSubtleCrypto = () => {
    ensureSecureContext();
    const subtle = window.crypto?.subtle;
    if (!subtle) {
        throw new Error("WebCrypto APIs are unavailable in this browser");
    }
    return subtle;
};

const applySchemaUpgrade = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
    }
    if (event.oldVersion < 2) {
        const store = event.target.transaction.objectStore(STORE_NAME);
        if (!store.indexNames.contains(DEVICE_SECRET_LABEL)) {
            store.createIndex(DEVICE_SECRET_LABEL, DEVICE_SECRET_LABEL, { unique: false });
        }
    }
};

const upgradeDatabase = (targetVersion) =>
    new Promise((resolve, reject) => {
        let request;
        try {
            request = indexedDB.open(DB_NAME, targetVersion);
        } catch (err) {
            reject(err);
            return;
        }
        request.onupgradeneeded = applySchemaUpgrade;
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
            reject(request.error || new Error("Unable to upgrade platform keystore"));
    });

const openDatabase = () =>
    new Promise((resolve, reject) => {
        ensureSecureContext();
        let request;
        try {
            request = indexedDB.open(DB_NAME);
        } catch (err) {
            reject(err);
            return;
        }

        request.onupgradeneeded = applySchemaUpgrade;
        request.onerror = () =>
            reject(request.error || new Error("Unable to open platform keystore"));
        request.onsuccess = async () => {
            const db = request.result;
            const currentVersion = db.version || 0;
            if (!DB_VERSION || currentVersion >= DB_VERSION) {
                resolve(db);
                return;
            }
            try {
                db.close();
                const upgraded = await upgradeDatabase(DB_VERSION);
                resolve(upgraded);
            } catch (upgradeError) {
                reject(upgradeError);
            }
        };
    });

const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

const base64ToArrayBuffer = (value) => {
    if (!value) {
        return new ArrayBuffer(0);
    }
    const binary = window.atob(value);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return buffer;
};

const pemBodyToArrayBuffer = (pemText) => {
    const normalized = (pemText || "").trim();
    if (!normalized.includes("BEGIN") || !normalized.includes("END")) {
        throw new Error("Invalid PEM format");
    }
    const body = normalized
        .replace(/-----BEGIN [^-]+-----/g, "")
        .replace(/-----END [^-]+-----/g, "")
        .replace(/\s+/g, "");
    const binary = window.atob(body);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return buffer;
};

const runTransaction = async (mode, executor) => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);

        executor(store, resolve, reject);

        tx.onabort = () => reject(tx.error || new Error("Secure keystore transaction aborted"));
    });
};

const generateDeviceSecretKey = () => {
    const subtle = getSubtleCrypto();
    return subtle.generateKey(DEVICE_SECRET_KEY_SPEC, false, DEVICE_SECRET_KEY_USAGE);
};

const encryptDeviceSecretForStorage = async (secret, existingKey) => {
    const normalized = (secret || "").trim();
    if (!normalized) {
        throw new Error("deviceSecret must be provided for secure storage");
    }
    const subtle = getSubtleCrypto();
    const key = existingKey || (await generateDeviceSecretKey());
    const ivBytes = window.crypto.getRandomValues(new Uint8Array(DEVICE_SECRET_IV_BYTES));
    const ciphertextBuffer = await subtle.encrypt(
        { name: "AES-GCM", iv: ivBytes },
        key,
        textEncoder.encode(normalized)
    );
    return {
        key,
        iv: arrayBufferToBase64(ivBytes.buffer),
        ciphertext: arrayBufferToBase64(ciphertextBuffer),
    };
};

const decryptDeviceSecretFromRecord = async (record) => {
    if (!record?.deviceSecretCiphertext || !record?.deviceSecretIv || !record?.deviceSecretKey) {
        return null;
    }
    try {
        const ivBytes = new Uint8Array(base64ToArrayBuffer(record.deviceSecretIv));
        const ciphertextBuffer = base64ToArrayBuffer(record.deviceSecretCiphertext);
        const subtle = getSubtleCrypto();
        const plaintextBuffer = await subtle.decrypt(
            { name: "AES-GCM", iv: ivBytes },
            record.deviceSecretKey,
            ciphertextBuffer
        );
        return textDecoder.decode(plaintextBuffer);
    } catch (error) {
        console.warn("Secure device secret decryption failed", error);
        return null;
    }
};

export const getStoredKey = async (certificateId) => {
    if (!certificateId) {
        return null;
    }
    return runTransaction("readonly", (store, resolve, reject) => {
        const request = store.get(certificateId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error || new Error("Secure key lookup failed"));
    });
};

export const storePlatformKey = async (certificateId, key, options = {}) => {
    if (!certificateId || !key) {
        throw new Error("certificateId and key are required for storage");
    }
    const existingRecord = await getStoredKey(certificateId);
    const now = Date.now();
    const payload = {
        ...(existingRecord || {}),
        key,
        created_at: existingRecord?.created_at || now,
        updated_at: now,
    };

    if (payload.hasOwnProperty(DEVICE_SECRET_LABEL)) {
        delete payload[DEVICE_SECRET_LABEL];
    }

    const nextSecret = options.deviceSecret || existingRecord?.[DEVICE_SECRET_LABEL] || null;
    if (nextSecret) {
        const encrypted = await encryptDeviceSecretForStorage(nextSecret, existingRecord?.deviceSecretKey);
        payload.deviceSecretKey = encrypted.key;
        payload.deviceSecretIv = encrypted.iv;
        payload.deviceSecretCiphertext = encrypted.ciphertext;
        payload.deviceSecretStoredAt = now;
        payload.deviceSecretVersion = DEVICE_SECRET_VERSION;
    }

    return runTransaction("readwrite", (store, resolve, reject) => {
        const request = store.put(payload, certificateId);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error || new Error("Unable to persist secure key"));
    });
};

export const removePlatformKey = async (certificateId) => {
    if (!certificateId) {
        return;
    }
    return runTransaction("readwrite", (store, resolve, reject) => {
        const request = store.delete(certificateId);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error || new Error("Unable to delete secure key"));
    });
};

export const enrollPlatformKey = async (certificateId, privateKey, options = {}) => {
    if (!certificateId || !privateKey) {
        throw new Error("certificateId and privateKey are required for enrollment");
    }
    await storePlatformKey(certificateId, privateKey, options);
    return true;
};

export const getStoredDeviceSecret = async (certificateId) => {
    if (!certificateId) {
        return null;
    }
    const record = await getStoredKey(certificateId);
    if (!record) {
        return null;
    }
    if (record.deviceSecretCiphertext && record.deviceSecretIv && record.deviceSecretKey) {
        return decryptDeviceSecretFromRecord(record);
    }
    return record?.[DEVICE_SECRET_LABEL] || null;
};

export const ensurePlatformKey = async (certificateId) => {
    const existing = await getStoredKey(certificateId);
    if (existing?.key) {
        return existing.key;
    }
    throw new Error("Secure key material missing. Re-enroll this certificate on the device.");
};

export const hasPlatformKey = async (certificateId) => {
    const record = await getStoredKey(certificateId);
    return Boolean(record?.key);
};

export const signWithPlatformKey = async (certificateId, messageBuffer) => {
    const stored = await getStoredKey(certificateId);
    if (!stored?.key) {
        throw new Error("Secure device key unavailable. Re-enroll certificate.");
    }
    const signature = await window.crypto.subtle.sign(
        { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
        stored.key,
        messageBuffer
    );
    return arrayBufferToBase64(signature);
};

export const listEnrolledCertificates = async () => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAllKeys();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error || new Error("Unable to enumerate secure keys"));
    });
};

export const generateClientKeyPair = async () => {
    ensureSecureContext();
    const subtle = window.crypto?.subtle;
    if (!subtle) {
        throw new Error("WebCrypto APIs are unavailable in this browser");
    }
    // extractable must be true so the public component can be exported for enrollment
    const keyPair = await subtle.generateKey(KEY_GEN_PARAMS, true, KEY_USAGE);
    const publicKeyBuffer = await subtle.exportKey("spki", keyPair.publicKey);
    const publicKeySpkiB64 = arrayBufferToBase64(publicKeyBuffer);
    return {
        privateKey: keyPair.privateKey,
        publicKeySpkiB64,
    };
};

export const importPrivateKeyFromPem = async (pemText) => {
    ensureSecureContext();
    const subtle = window.crypto?.subtle;
    if (!subtle) {
        throw new Error("WebCrypto APIs are unavailable in this browser");
    }
    const keyBuffer = pemBodyToArrayBuffer(pemText);
    return subtle.importKey(
        "pkcs8",
        keyBuffer,
        KEY_GEN_PARAMS,
        false,
        PRIVATE_KEY_IMPORT_USAGE,
    );
};