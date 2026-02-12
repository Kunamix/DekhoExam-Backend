import dotenvFlow from "dotenv-flow";
dotenvFlow.config();

const _environment = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DIRECT_URL: process.env.DIRECT_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  REFRESH_SECRET: process.env.REFRESH_SECRET,
  ACCESS_SECRET: process.env.ACCESS_SECRET,
  OTP_VERIFY_SECRET: process.env.OTP_VERIFY_SECRET,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  HEALTH_CHECK_URL: process.env.HEALTH_CHECK_URL,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};

// Validate required environment variables
const requiredEnvVars = [
  "DATABASE_URL",
  "ACCESS_SECRET",
  "REFRESH_SECRET",
  "OTP_VERIFY_SECRET",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName],
);

if (missingEnvVars.length > 0) {
  console.error(
    "❌ Missing required environment variables:",
    missingEnvVars.join(", "),
  );
  console.error(
    "Please check your .env file and ensure all required variables are set.",
  );
  process.exit(1);
}

export const myEnvironment = Object.freeze(_environment);
