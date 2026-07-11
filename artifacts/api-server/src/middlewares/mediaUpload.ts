import multer from "multer";
import { isAllowedImageMimeType } from "../lib/media-storage";

export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;

export const mediaUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MEDIA_MAX_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (isAllowedImageMimeType(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("UNSUPPORTED_IMAGE_TYPE"));
  },
});

export function mediaUploadSingle(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
): void {
  mediaUploadMiddleware.single("file")(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: "Image must be 5 MB or smaller." });
        return;
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        res.status(400).json({ error: 'Upload field must be named "file".' });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }

    if (err instanceof Error && err.message === "UNSUPPORTED_IMAGE_TYPE") {
      res.status(400).json({
        error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF.",
      });
      return;
    }

    next(err);
  });
}
