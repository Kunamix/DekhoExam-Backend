export * from "./status-codes";
export * from "./error-messages";
export * from "./success-messages";

export const APP_CONSTANTS = {
  FREE_TESTS_LIMIT: 5,
  OTP_LENGTH: 4,
  OTP_EXPIRY_MINUTES: 5,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  ALLOWED_DOCUMENT_TYPES: ["application/pdf", "text/csv"],
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },
  TEST: {
    MIN_QUESTIONS: 10,
    MAX_QUESTIONS: 200,
    DEFAULT_DURATION: 60, // minutes
  },
} as const;
