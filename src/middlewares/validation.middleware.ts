import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { HTTP_STATUS } from "@/constants";
import { ApiError } from "@/utils/api-error.util";

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const formattedErrors = err.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));

        return next(
          new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            "Validation failed",
            formattedErrors,
          ),
        );
      }
      next(err);
    }
  };
};
