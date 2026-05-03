export const ERROR_MESSAGES = {
  // Auth errors
  INVALID_CREDENTIALS: "Invalid credentials",
  INVALID_OTP: "Invalid OTP",
  OTP_EXPIRED: "OTP expired",
  OTP_ALREADY_USED: "OTP already used",
  OTP_SESSION_EXPIRED: "OTP session expired",
  OTP_CODE_REQUIRED: "OTP code is required",
  OTP_TOKEN_MISSING: "OTP verification token missing",
  OTP_REQUEST_NEW: "Session expired. Please request a new OTP",
  TOO_MANY_OTP_ATTEMPTS: "Too many failed attempts. Please request a new OTP",
  UNAUTHORIZED: "Unauthorized",
  UNAUTHORIZED_REQUEST: "Unauthorized request",
  UNAUTHORIZED_USER_MISSING: "Unauthorized: User information missing",
  TOKEN_EXPIRED: "Your session has expired. Please login again",
  SESSION_EXPIRED: "Session expired",
  REFRESH_TOKEN_REQUIRED: "Refresh token required",
  REFRESH_TOKEN_INVALID: "Invalid or expired refresh token",
  INVALID_REFRESH_TOKEN: "Invalid refresh token",
  ACCOUNT_BANNED: "Your account has been banned",
  ACCOUNT_DEACTIVATED: "Your account has been deactivated. Contact Admin",
  ADMIN_ONLY: "This action is only available to administrators",
  PLEASE_USE_OTP_LOGIN: "Please use OTP login",
  INVALID_PHONE_NUMBER: "Invalid phone number",
  PROVIDE_ALL_FIELDS: "Please provide all fields",
  PHONE_NUMBER_REQUIRED: "Please provide phone number",
  INVALID_REQUEST_OR_OTP: "Invalid request or OTP expired",

  // User errors
  USER_NOT_FOUND: "User not found",
  USER_ALREADY_EXISTS: "User with this phone number already exists",
  EMAIL_ALREADY_EXISTS: "Email is already associated with another account",
  PROVIDE_NAME_OR_EMAIL: "Please provide a name or email to update",
  INVALID_EMAIL_FORMAT: "Invalid email format",
  NEW_PASSWORD_REQUIRED: "New password is required",
  CURRENT_PASSWORD_REQUIRED: "Current password is required",
  CURRENT_PASSWORD_INCORRECT: "Current password is incorrect",
  CANNOT_BAN_ADMIN: "Cannot ban admin users",
  CANNOT_DELETE_ADMIN: "Cannot delete admin users",
  SEARCH_QUERY_TOO_SHORT: "Search query must be at least 2 characters",

  // Category errors
  CATEGORY_NOT_FOUND: "Category not found",
  CATEGORY_ALREADY_EXISTS: "Category with this name already exists",
  CATEGORY_HAS_TESTS: "Cannot delete category with existing tests",
  CATEGORY_HAS_ASSOCIATIONS:
    "Cannot delete category with associated tests or subjects",
  CATEGORY_NAME_REQUIRED: "Category name is required",
  CATEGORY_ID_REQUIRED: "Category ID is required",
  CATEGORIES_ARRAY_REQUIRED: "Categories array is required",
  CATEGORIES_NOT_FOUND: "One or more categories not found",

  // Subject errors
  SUBJECT_NOT_FOUND: "Subject not found",
  SUBJECT_ALREADY_EXISTS: "Subject with this name already exists",
  SUBJECT_NAME_REQUIRED: "Subject name is required",
  SUBJECTS_ARRAY_REQUIRED: "Subjects array is required",

  // Topic errors
  TOPIC_NOT_FOUND: "Topic not found",
  TOPIC_ID_REQUIRED: "Topic ID is required",
  TOPIC_AND_NAME_REQUIRED: "Subject ID and topic name are required",
  TOPIC_HAS_QUESTIONS:
    "Cannot delete topic with associated questions. Please delete or reassign questions first.",

  // Question errors
  QUESTION_NOT_FOUND: "Question not found",
  INVALID_QUESTION_DATA: "Invalid question data",
  ALL_FIELDS_REQUIRED: "All required fields must be provided",
  CORRECT_OPTION_INVALID: "Correct option must be between 1 and 4",
  BULK_UPLOAD_FAILED: "Bulk upload failed",

  // Test errors
  TEST_NOT_FOUND: "Test not found",
  TEST_ALREADY_STARTED: "You have already started this test",
  TEST_NOT_STARTED: "Test attempt not found or not started",
  TEST_ALREADY_SUBMITTED: "This test has already been submitted",
  TEST_EXPIRED: "Test time has expired",
  NO_FREE_TESTS:
    "You have used your free attempts. Please purchase a subscription.",
  SUBSCRIPTION_REQUIRED: "Active subscription required to take this test",
  TEST_FIELDS_REQUIRED: "Category ID, test name, and test number are required",
  TEST_NUMBER_EXISTS: "Test with this number already exists in this category",
  NO_SUBJECTS_CONFIGURED: "No subjects configured for this category",
  TEST_NUMBER_REQUIRED: "Test number is required for cloning",
  ACTIVE_ATTEMPT_EXISTS: "You already have an active attempt for this test",
  USER_TEST_ID_REQUIRED: "User ID and Test ID are required",
  PRESELECTED_QUESTIONS_MISSING:
    "Some pre-selected questions are missing or inactive",
  NOT_ENOUGH_QUESTIONS: "Not enough questions available for this test",

  // Test attempt errors
  TEST_ATTEMPT_NOT_FOUND: "Test attempt not found",
  INVALID_ATTEMPT: "Invalid attempt or test already submitted",
  INVALID_ATTEMPT_OR_SUBMITTED: "Invalid attempt or already submitted",
  CANNOT_SAVE_ANSWER: "Cannot save answer. Test is not in progress.",
  RESULT_NOT_AVAILABLE: "Result not available",
  NO_PERMISSION_VIEW_SOLUTION:
    "You do not have permission to view this solution",
  TEST_IN_PROGRESS: "Test is still in progress. Submit it to view solutions",

  // Subscription errors
  SUBSCRIPTION_NOT_FOUND: "Subscription plan not found",
  NO_ACTIVE_SUBSCRIPTION: "No active subscription found",
  SUBSCRIPTION_ALREADY_ACTIVE: "You already have an active subscription",
  SUBSCRIPTION_FIELDS_REQUIRED: "Name, price, duration, and type are required",
  CATEGORY_ID_REQUIRED_FOR_PLAN:
    "Category ID is required for category-specific plans",
  CATEGORY_ID_NOT_ALLOWED_FOR_PLAN:
    "Category ID should not be provided for all-categories plans",
  INVALID_ADDITIONAL_DAYS: "Valid additional days are required",
  INVALID_SUBSCRIPTION_DURATION: "Invalid subscription duration",
  USER_SUBSCRIPTION_FIELDS_REQUIRED: "User ID and Plan ID are required",

  // Payment errors
  PAYMENT_FAILED: "Payment failed. Please try again",
  PAYMENT_NOT_FOUND: "Payment not found",
  PAYMENT_RECORD_NOT_FOUND: "Payment record not found",
  INVALID_PAYMENT_SIGNATURE: "Invalid payment signature",
  PAYMENT_DETAILS_MISSING: "Payment verification details missing",
  PAYMENT_SIGNATURE_FAILED: "Payment signature verification failed",
  PAYMENT_ORDER_FAILED: "Failed to create order with payment gateway",
  PAYMENT_INIT_FAILED: "Something went wrong while initializing payment",
  PLAN_ID_REQUIRED: "planId is required",
  INVALID_WEBHOOK_SIGNATURE: "Invalid webhook signature",

  // Report errors
  REPORT_NOT_FOUND: "Report not found",
  INVALID_REPORT_STATUS:
    "Invalid status. Must be PENDING, RESOLVED, or DISMISSED",
  STATUS_REQUIRED: "Status is required",

  // Notification errors
  NOTIFICATION_NOT_FOUND: "Notification not found",

  // Audit errors
  AUDIT_LOG_NOT_FOUND: "Audit log not found",

  // File upload errors
  FILE_TOO_LARGE: "File size exceeds the maximum limit",
  INVALID_FILE_TYPE: "Invalid file type",
  FILE_UPLOAD_FAILED: "File upload failed",
  IMAGE_UPLOAD_FAILED: "Failed to upload image",
  QUESTION_IMAGE_UPLOAD_FAILED: "Failed to upload question image",
  EXPLANATION_IMAGE_UPLOAD_FAILED: "Failed to upload explanation image",
  FILE_REQUIRED: "CSV or Excel file is required",
  INVALID_FILE_TYPE_CSV_EXCEL:
    "Invalid file type. Only CSV and Excel (.xls, .xlsx) files are allowed",
  EXCEL_NO_SHEETS: "Excel file has no sheets",
  EXCEL_PARSE_FAILED:
    "Failed to parse Excel file. Ensure it is a valid .xls or .xlsx file",
  FILE_EMPTY: "File is empty or has no data rows",
  NO_VALID_QUESTIONS:
    "No valid questions found in the file. Check all rows for missing fields.",

  // Generic errors
  VALIDATION_ERROR: "Validation failed",
  INTERNAL_SERVER_ERROR: "An unexpected error occurred",
  NOT_FOUND: "Resource not found",
  FORBIDDEN: "Access forbidden",
} as const;
