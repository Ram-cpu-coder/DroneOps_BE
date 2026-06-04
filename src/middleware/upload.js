import multer from "multer";
import { AppError } from "../utils/AppError.js";

const fileFilter = (_req, file, cb) => {
  const allowedMimePrefix = ["image/", "application/pdf", "text/csv", "application/json"];
  const isAllowed = allowedMimePrefix.some((prefix) => file.mimetype.startsWith(prefix));

  if (!isAllowed) {
    return cb(new AppError("Unsupported document type", 415));
  }

  return cb(null, true);
};

export const uploadSingleDocument = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
}).single("file");
