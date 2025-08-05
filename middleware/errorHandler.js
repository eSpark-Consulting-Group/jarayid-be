import { logError } from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  console.error(err); // This will also trigger logError due to override

  logError(err.message, {
    stack: err.stack,
    errorCode: err.name,
    category: "API",
    path: req.originalUrl,
    method: req.method,
  });

  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal Server Error" });
};
