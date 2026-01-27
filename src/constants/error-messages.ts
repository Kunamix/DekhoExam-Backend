export const ERROR_MESSAGES = {
  // Auth errors
  INVALID_CREDENTIALS: "Invalid phone number or password",
  INVALID_OTP: "Invalid or expired OTP",
  OTP_EXPIRED: "OTP has expired. Please request a new one",
  UNAUTHORIZED: "You are not authorized to access this resource",
  TOKEN_EXPIRED: "Your session has expired. Please login again",
  ACCOUNT_BANNED: "Your account has been banned",
  ADMIN_ONLY: "This action is only available to administrators",

  // User errors
  USER_NOT_FOUND: "User not found",
  USER_ALREADY_EXISTS: "User with this phone number already exists",
  EMAIL_ALREADY_EXISTS: "User with this email already exists",

  // Category errors
  CATEGORY_NOT_FOUND: "Category not found",
  CATEGORY_ALREADY_EXISTS: "Category with this name already exists",
  CATEGORY_HAS_TESTS: "Cannot delete category with existing tests",

  // Subject errors
  SUBJECT_NOT_FOUND: "Subject not found",
  SUBJECT_ALREADY_EXISTS: "Subject with this name already exists",

  // Topic errors
  TOPIC_NOT_FOUND: "Topic not found",

  // Question errors
  QUESTION_NOT_FOUND: "Question not found",
  INVALID_QUESTION_DATA: "Invalid question data",
  BULK_UPLOAD_FAILED: "Bulk upload failed",

  // Test errors
  TEST_NOT_FOUND: "Test not found",
  TEST_ALREADY_STARTED: "You have already started this test",
  TEST_NOT_STARTED: "Test attempt not found or not started",
  TEST_ALREADY_SUBMITTED: "This test has already been submitted",
  TEST_EXPIRED: "Test time has expired",
  NO_FREE_TESTS: "You have used all your free tests",
  SUBSCRIPTION_REQUIRED: "Active subscription required to take this test",

  // Subscription errors
  SUBSCRIPTION_NOT_FOUND: "Subscription plan not found",
  NO_ACTIVE_SUBSCRIPTION: "No active subscription found",
  SUBSCRIPTION_ALREADY_ACTIVE: "You already have an active subscription",

  // Payment errors
  PAYMENT_FAILED: "Payment failed. Please try again",
  PAYMENT_NOT_FOUND: "Payment not found",
  INVALID_PAYMENT_SIGNATURE: "Invalid payment signature",

  // File upload errors
  FILE_TOO_LARGE: "File size exceeds the maximum limit",
  INVALID_FILE_TYPE: "Invalid file type",
  FILE_UPLOAD_FAILED: "File upload failed",

  // Generic errors
  VALIDATION_ERROR: "Validation failed",
  INTERNAL_SERVER_ERROR: "An unexpected error occurred",
  NOT_FOUND: "Resource not found",
  FORBIDDEN: "Access forbidden",
} as const;