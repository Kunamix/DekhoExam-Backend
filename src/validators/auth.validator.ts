import {z} from "zod"

export const authValidator = {
  login: z.object({
    body: z.object({
      phoneNumber: z.string().min(10, "Phone number must be digits").max(10,"Phone number must be 10 digits").regex(/^[0-9]+$/, "Phone number must contain only digits"),
    }),
  }),
}