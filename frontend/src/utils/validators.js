/**
 * Check if uploaded file is a valid certificate file
 * Allowed formats: .pem, .crt
 */
export const validateCertificateFile = (file) => {
    if (!file) {
        return { valid: false, message: "Certificate file is required" };
    }

    const allowedExtensions = ["pem", "crt"];
    const fileExtension = file.name.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
        return {
            valid: false,
            message: "Invalid certificate format. Use .pem or .crt",
        };
    }

    if (file.size > 5 * 1024 * 1024) {
        return {
            valid: false,
            message: "Certificate file size must be less than 5MB",
        };
    }

    return { valid: true };
};

/**
 * Basic amount validation (for transactions)
 */
export const validateAmount = (amount) => {
    if (!amount) return "Amount is required";
    if (isNaN(amount)) return "Amount must be a number";
    if (Number(amount) <= 0) return "Amount must be greater than zero";
    return null;
};

/**
 * Generic required field validator
 */
export const isRequired = (value, fieldName = "Field") => {
    if (!value || value.toString().trim() === "") {
        return `${fieldName} is required`;
    }
    return null;
};
