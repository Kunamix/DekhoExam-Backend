import { ApiResponse } from "@/utils";
import { Request, Response } from "express";
import rateLimit from "express-rate-limit";

export const limiter = (sec:number, max:number) => {
  return rateLimit({
    windowMs: 1000 * sec,
    max:max,
    message: {
      status: 429,
      success: false,
      error: "Too many request",
      message: "You have exceeded the request limit. Try again later",
    },
    headers: true,
    handler:(_req:Request, res:Response) => {
      res.status(429).json(new ApiResponse(
        420,
        null,
        "Slow down! You have exceeded the rate limit. Please try again later."
      ))
    }
  })
}