export const SUCCESS_MESSAGES = {
  // Auth
  OTP_SENT: "OTP sent successfully",
  LOGIN_SUCCESS: "Login successful",
  LOGOUT_SUCCESS: "Logout successful",
  PASSWORD_CHANGED: "Password changed successfully",

  // User
  PROFILE_UPDATED: "Profile updated successfully",
  AVATAR_UPLOADED: "Avatar uploaded successfully",
  ACCOUNT_DELETED: "Account deleted successfully",

  // Category
  CATEGORY_CREATED: "Category created successfully",
  CATEGORY_UPDATED: "Category updated successfully",
  CATEGORY_DELETED: "Category deleted successfully",

  // Subject
  SUBJECT_CREATED: "Subject created successfully",
  SUBJECT_UPDATED: "Subject updated successfully",
  SUBJECT_DELETED: "Subject deleted successfully",

  // Topic
  TOPIC_CREATED: "Topic created successfully",
  TOPIC_UPDATED: "Topic updated successfully",
  TOPIC_DELETED: "Topic deleted successfully",

  // Question
  QUESTION_CREATED: "Question created successfully",
  QUESTION_UPDATED: "Question updated successfully",
  QUESTION_DELETED: "Question deleted successfully",
  BULK_UPLOAD_SUCCESS: "Questions uploaded successfully",

  // Test
  TEST_CREATED: "Test created successfully",
  TEST_UPDATED: "Test updated successfully",
  TEST_DELETED: "Test deleted successfully",
  TEST_STARTED: "Test started successfully",
  ANSWER_SAVED: "Answer saved successfully",
  TEST_SUBMITTED: "Test submitted successfully",

  // Subscription
  SUBSCRIPTION_CREATED: "Subscription plan created successfully",
  SUBSCRIPTION_UPDATED: "Subscription plan updated successfully",
  SUBSCRIPTION_DELETED: "Subscription plan deleted successfully",
  SUBSCRIPTION_ACTIVATED: "Subscription activated successfully",
  SUBSCRIPTION_CANCELLED: "Subscription cancelled successfully",

  // Payment
  ORDER_CREATED: "Order created successfully",
  PAYMENT_VERIFIED: "Payment verified successfully",

  // Generic
  OPERATION_SUCCESS: "Operation completed successfully",
  DATA_FETCHED: "Data fetched successfully",
} as const;