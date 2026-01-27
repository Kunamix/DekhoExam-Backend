import { UserRole } from "@/generated/prisma/enums";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role?: UserRole,
        phoneNumber?: string;
        email?: string;
      };
      deviceId?: string;
    }
  }
}