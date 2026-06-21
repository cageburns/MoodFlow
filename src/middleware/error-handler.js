export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "The requested resource was not found.",
      details: []
    }
  });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(error.statusCode || 500).json({
    error: {
      code: error.code || "INTERNAL_ERROR",
      message: error.publicMessage || "An unexpected error occurred.",
      details: Array.isArray(error.details) ? error.details : []
    }
  });
}
