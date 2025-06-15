export class InternalServerError extends Error {
  constructor({ cause, statusCode }) {
    super("An unexpected internal error happened", { cause });

    this.name = "InternalServerError";
    this.action = "Please contact the support";
    this.statusCode = statusCode || 500;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class ServiceError extends Error {
  constructor({ cause, message }) {
    super(message || "Unavailable service at the moment", { cause });

    this.name = "ServiceError";
    this.action = "Please check if the service is available";
    this.statusCode = 503;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class ValidationError extends Error {
  constructor({ cause, message, action }) {
    super(message || "A validation error occurred.", { cause });

    this.name = "ValidationError";
    this.action = action || "Please review the data and try again";
    this.statusCode = 400;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class NotFoundError extends Error {
  constructor({ cause, message, action }) {
    super(message || "The resource was not found in the system.", { cause });

    this.name = "NotFoundError";
    this.action = action || "Check if the sent data is correct";
    this.statusCode = 404;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class MethodNotAllowedError extends Error {
  constructor() {
    super("Method not allowed on this endpoint");

    this.name = "MethodNotAllowedError";
    this.action = "Check if the sent http method is valid on this endpoint";
    this.statusCode = 405;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class UnauthorizedError extends Error {
  constructor({ cause, message, action }) {
    super(message || "User not authenticated.", { cause });

    this.name = "UnauthorizedError";
    this.action = action || "Try to login again to continue.";
    this.statusCode = 401;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}
