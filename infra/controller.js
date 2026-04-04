import * as cookie from "cookie";
import activation from "models/activation";
import authorization from "models/authorization";
import session from "models/session";
import user from "models/user";
import {
  ForbiddenError,
  InternalServerError,
  MethodNotAllowedError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./errors";

function onNoMatchHandler(request, response) {
  const publicErrorObject = new MethodNotAllowedError();
  response.status(publicErrorObject.statusCode).json(publicErrorObject);

  response.status(publicErrorObject.statusCode).end();
}

function onErrorHandler(error, request, response) {
  if (error instanceof UnauthorizedError) {
    clearSessionCookie(response);
    return response.status(error.statusCode).json(error);
  }

  if (
    error instanceof ValidationError ||
    error instanceof NotFoundError ||
    error instanceof ForbiddenError
  ) {
    return response.status(error.statusCode).json(error);
  }

  const publicErrorObject = new InternalServerError({
    cause: error,
  });

  console.error(publicErrorObject);
  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

function setSessionCookie(sessionToken, response) {
  const setCookie = cookie.serialize("session_id", sessionToken, {
    path: "/",
    maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });

  response.setHeader("Set-Cookie", setCookie);
}

function clearSessionCookie(response) {
  const setCookie = cookie.serialize("session_id", "invalid", {
    path: "/",
    maxAge: -1,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });

  response.setHeader("Set-Cookie", setCookie);
}

async function injectAnonymousOrUser(request, response, next) {
  if (request.cookies?.session_id) {
    await injectAuthenticatedUser(request);
    return next();
  }

  injectAnonymousUser(request);
  return next();
}

async function injectAuthenticatedUser(request) {
  const sessionToken = request.cookies.session_id;

  const sessionObject = await session.findOneValidByToken(sessionToken);
  const userObject = await user.findOneById(sessionObject.user_id);

  request.context = {
    ...request.context,
    user: userObject,
  };
}

function injectAnonymousUser(request) {
  const anonymousUserObject = {
    features: ["read:activation_token", "create:session", "create:user"],
  };

  request.context = {
    ...request.context,
    user: anonymousUserObject,
  };
}

function canRequest(feature) {
  return function canRequestMiddleware(request, response, next) {
    const userTryingToRequest = request.context.user;

    if (authorization.can(userTryingToRequest, feature)) {
      return next();
    }

    throw new ForbiddenError({
      message: "You do not have permission to perform this action.",
      action: `Check if your user has the "${feature}" feature.`,
    });
  };
}

async function canRequestActivation(request, response, next) {
  const token = request.query.token_id;
  const usedTokenAndFeatures = await activation.getUsedTokenAndFeatures(token);
  const userTryingToRequest = usedTokenAndFeatures
    ? await user.findOneById(usedTokenAndFeatures.user_id)
    : request.context.user;

  if (authorization.can(userTryingToRequest, "read:activation_token")) {
    return next();
  }

  if (
    (usedTokenAndFeatures && userTryingToRequest.features.length) ||
    request.cookies?.session_id
  ) {
    throw new ForbiddenError({
      message: "Your account is already activated.",
      action: "You are allowed to access your account.",
    });
  }

  throw new ForbiddenError({
    message: "You no longer have access to the system.",
    action: "If you think this is a mistake, contact the support team.",
  });
}

const controller = {
  errorHandlers: {
    onNoMatch: onNoMatchHandler,
    onError: onErrorHandler,
  },
  setSessionCookie,
  clearSessionCookie,
  injectAnonymousOrUser,
  canRequest,
  canRequestActivation,
};

export default controller;
