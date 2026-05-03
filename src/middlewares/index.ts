import { verifyToken, verifyAdmin } from "./auth.middleware";
import { notFoundHandler, errorHandler } from "./error.middleware";
import { docUpload } from "./multer.middleware";
import { imageUpload } from "./multer-images.middleware";

export {
  verifyToken,
  verifyAdmin,
  notFoundHandler,
  errorHandler,
  docUpload,
  imageUpload,
};
