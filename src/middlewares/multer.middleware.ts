import multer from "multer";
import { Request } from "express";

const ALLOWED_DOC_TYPES = [
  "text/csv",
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
];

const ALLOWED_DOC_EXTENSIONS = [".csv", ".xls", ".xlsx"];

// Configure multer for memory storage (CSV/Excel files)
const docStorage = multer.memoryStorage();

// File filter function
const docFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const ext = file.originalname
    .substring(file.originalname.lastIndexOf("."))
    .toLowerCase();

  // Check extension FIRST — more reliable than MIME type
  // Some systems send application/octet-stream for CSV files
  if (ALLOWED_DOC_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else if (ALLOWED_DOC_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only CSV and Excel (.xls, .xlsx) files are allowed"));
  }
};
/**
 * Multer instance for document uploads (CSV, Excel).
 * - Stored in memory buffer
 * - Max 10MB per file
 * - Only CSV and Excel mimetypes allowed
 */
export const docUpload = multer({
  storage: docStorage,
  fileFilter: docFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});
