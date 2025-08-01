import BugController from "../controllers/bugController.js";
import { response } from "../utils/index.js";

// Create a single instance of BugController for logging
const bugController = new BugController();

/**
 * Global error-handling middleware.
 * This should be registered AFTER all routes in your Express app.
 */
const errorHandler = async (err, req, res, next) => {
  console.error("Unhandled Error:", err);

  try {
    // Log the bug into the in-app bug monitoring system
    await bugController.logBug({
      type: "UnhandledError",
      category: "Server",
      description: err.message || "Unknown error occurred",
      level: "error",
      eventMessage: err.stack || "No stack trace available",
    });
  } catch (loggingError) {
    console.error("Failed to log bug:", loggingError);
  }

  // Send a safe error response to the client
  return response.error(res, "Internal Server Error", 500, err.message);
};

export default errorHandler;