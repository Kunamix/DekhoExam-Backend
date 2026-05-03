import { prisma } from "@/configs";
import { myEnvironment } from "@/configs/env.config";
import { ApiError } from "@/utils/api-error.util";
import { asyncHandler } from "@/utils/async-handler-util";
import { authHelper } from "@/utils/auth-helper.util";
import { NextFunction, Request, Response } from "express";

export const verifyToken = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token =
      req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];


    if (!token) {
      throw new ApiError(401, "Access token required");
    }
    const decoded = authHelper.verifyToken(
      token,
      myEnvironment.ACCESS_SECRET as string,
    );

    const session = await prisma.session.findFirst({
      where: {
        token,
        userId: decoded.id,
      },
    });

    if (!session) {
      throw new ApiError(401, "Invalid or expired session");
    }

    if (new Date() > session.expiresAt) {
      await prisma.session.delete({
        where: { id: session.id },
      });

      throw new ApiError(401, "Session expired");
    }

    (req).user = {
      id: decoded.id, 
    };
    next();
  },
);

export const verifyAdmin = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {

    const user = req.user;

    if (!user) {
      throw new ApiError(403, "Admin access required");
    }

    const admin = await prisma.user.findUnique({
      where: { id: user.id},
    });

    if (!admin || admin.role !== "ADMIN") {
      throw new ApiError(403, "Admin access required");
    }
    next();
  },
);
