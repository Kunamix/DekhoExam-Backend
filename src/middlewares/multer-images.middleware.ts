import multer, { StorageEngine } from "multer";
import { Request } from "express";
import path from "path";
import fs from "fs";

// Ensure the upload directory exists
const UPLOAD_DIR = "./public/image";
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

const imageStorage: StorageEngine = multer.diskStorage({
  destination: (
    _req: Request,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void,
  ) => {
    cb(null, UPLOAD_DIR);
  },

  filename: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) => {
    const fileExtension = path.extname(file.originalname);

    const filenameWithoutExtension = path
      .basename(file.originalname, fileExtension)
      .toLowerCase()
      .split(" ")
      .join("-")
      .replace(/[^a-z0-9-]/g, ""); // sanitize filename

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e5)}`;

    cb(null, `${filenameWithoutExtension}-${uniqueSuffix}${fileExtension}`);
  },
});

/**
 * Multer instance for image uploads.
 * - Saves to ./public/image
 * - Max 2MB per file
 * - Only image mimetypes allowed
 */
export const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed (jpeg, png, webp, gif, svg)"));
    }
  },
});
