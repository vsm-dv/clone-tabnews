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
