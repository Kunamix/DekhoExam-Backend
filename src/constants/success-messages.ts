export const SUCCESS_MESSAGES = {
  // Auth
  OTP_SENT: "OTP sent successfully",
  LOGIN_SUCCESS: "Login successful",
  LOGOUT_SUCCESS: "Logout successful",
  USER_LOGGED_OUT: "User logged out successfully",
  PASSWORD_CHANGED: "Password changed successfully",
  PASSWORD_UPDATED: "Password updated successfully. Please login again.",
  OTP_VERIFIED: "User verified and logged in successfully",
  TOKEN_REFRESHED: "Token refreshed successfully",

  // User
  PROFILE_UPDATED: "Profile updated successfully",
  AVATAR_UPLOADED: "Avatar uploaded successfully",
  ACCOUNT_DELETED: "Account deleted successfully",
  USER_INFO_FETCHED: "User info fetched successfully",
  USER_PROFILE_FETCHED: "User profile fetched successfully",
  USERS_FETCHED: "Users fetched successfully",
  USER_FETCHED: "User fetched successfully",
  USER_DELETED: "User deleted successfully",
  FREE_TESTS_RESET: "Free tests reset successfully",
  SESSIONS_INVALIDATED: "User sessions invalidated successfully",
  USER_STATS_FETCHED: "User statistics fetched successfully",
  SEARCH_COMPLETED: "Users search completed",

  // Category
  CATEGORY_CREATED: "Category created successfully",
  CATEGORY_UPDATED: "Category updated successfully",
  CATEGORY_DELETED: "Category deleted successfully",
  CATEGORIES_FETCHED: "Categories fetched successfully",
  CATEGORY_FETCHED: "Category fetched successfully",
  SUBJECTS_ASSIGNED: "Subjects assigned to category successfully",
  CATEGORIES_REORDERED: "Categories reordered successfully",

  // Subject
  SUBJECT_CREATED: "Subject created successfully",
  SUBJECT_UPDATED: "Subject updated successfully",
  SUBJECT_DELETED: "Subject deleted successfully",
  SUBJECTS_FETCHED: "Subjects fetched successfully",
  SUBJECT_FETCHED: "Subject fetched successfully",
  SUBJECT_STATS_FETCHED: "Subject statistics fetched successfully",
  SUBJECTS_REORDERED: "Subjects reordered successfully",

  // Topic
  TOPIC_CREATED: "Topic created successfully",
  TOPIC_UPDATED: "Topic updated successfully",
  TOPIC_DELETED: "Topic deleted successfully",
  TOPICS_FETCHED: "Topics fetched successfully",
  TOPIC_FETCHED: "Topic fetched successfully",

  // Question
  QUESTION_CREATED: "Question created successfully",
  QUESTION_UPDATED: "Question updated successfully",
  QUESTION_DELETED: "Question deleted successfully",
  QUESTIONS_FETCHED: "Questions fetched successfully",
  QUESTION_FETCHED: "Question fetched successfully",
  QUESTION_STATS_FETCHED: "Question statistics fetched successfully",
  BULK_UPLOAD_SUCCESS: "Questions uploaded successfully",

  // Test
  TEST_CREATED: "Test created successfully",
  TEST_UPDATED: "Test updated successfully",
  TEST_DELETED: "Test deleted successfully",
  TEST_STARTED: "Test started successfully",
  TEST_CLONED: "Test cloned successfully",
  ANSWER_SAVED: "Answer saved successfully",
  TEST_SUBMITTED: "Test submitted successfully",
  TESTS_FETCHED: "Tests fetched successfully",
  TEST_FETCHED: "Test fetched successfully",
  TEST_STATS_FETCHED: "Test statistics fetched successfully",
  INSTRUCTIONS_FETCHED: "Instructions fetched",
  QUESTIONS_LOADED: "Questions fetched",
  RESULT_FETCHED: "Result fetched",
  SOLUTIONS_FETCHED: "Solutions fetched successfully",
  HISTORY_FETCHED: "History fetched",
  POPULAR_TESTS_FETCHED: "Popular tests fetched",

  // Subscription
  SUBSCRIPTION_CREATED: "Subscription plan created successfully",
  SUBSCRIPTION_UPDATED: "Subscription plan updated successfully",
  SUBSCRIPTION_DELETED: "Subscription plan deleted successfully",
  SUBSCRIPTION_ACTIVATED: "Subscription activated successfully",
  SUBSCRIPTION_CANCELLED: "Subscription cancelled successfully",
  SUBSCRIPTION_PLAN_FETCHED: "Subscription plan fetched successfully",
  SUBSCRIPTION_STATS_FETCHED: "Subscription statistics fetched successfully",
  SUBSCRIPTION_PLANS_FETCHED: "Subscription plans fetched successfully",
  USER_SUBSCRIPTIONS_FETCHED: "User subscriptions fetched successfully",
  USER_SUBSCRIPTION_CREATED: "User subscription created successfully",

  // Payment
  ORDER_CREATED: "Order created successfully",
  PAYMENT_VERIFIED: "Payment verified successfully",
  PAYMENT_ORDER_CREATED: "Payment order created",
  PAYMENT_ALREADY_PROCESSED: "Payment already processed",
  PAYMENT_VERIFIED_SUBSCRIPTION: "Payment verified and subscription activated",
  PAYMENTS_FETCHED: "Payments fetched successfully",
  PAYMENT_STATS_FETCHED: "Payment statistics fetched successfully",
  PAYMENT_FETCHED: "Payment fetched successfully",
  PAYMENT_HISTORY_FETCHED: "Payment history fetched successfully",

  // Report
  REPORTS_FETCHED: "Reports retrieved successfully",
  REPORT_STATS_FETCHED: "Report statistics retrieved successfully",
  REPORT_FETCHED: "Report retrieved successfully",
  REPORT_STATUS_UPDATED: "Report status updated successfully",
  REPORT_DELETED: "Report deleted successfully",

  // Notification
  NOTIFICATIONS_FETCHED: "Notifications fetched successfully",
  NOTIFICATION_READ: "Notification marked as read",
  ALL_NOTIFICATIONS_READ: "All notifications marked as read",
  NOTIFICATION_DELETED: "Notification deleted successfully",

  // Audit
  AUDIT_LOGS_FETCHED: "Audit logs retrieved successfully",
  AUDIT_LOG_FETCHED: "Audit log retrieved successfully",

  // Dashboard
  DASHBOARD_STATS_FETCHED: "Dashboard stats fetched",
  CHART_DATA_FETCHED: "Chart data fetched",
  ANALYTICS_FETCHED: "Reports analytics fetched successfully",
  RECENT_USERS_FETCHED: "Recent users fetched",
  RECENT_PAYMENTS_FETCHED: "Recent payments retrieved successfully",
  RECENT_TESTS_FETCHED: "Recent tests retrieved successfully",

  // Generic
  OPERATION_SUCCESS: "Operation completed successfully",
  DATA_FETCHED: "Data fetched successfully",
} as const;
