import controller from "infra/controller";
import activation from "models/activation";
import { createRouter } from "next-connect";

const router = createRouter();

router.patch(patchHandler);

export default router.handler(controller.errorHandlers);

async function patchHandler(request, response) {
  const activationTokenId = request.query.token_id;

  const usedActivationToken =
    await activation.markTokenAsUsed(activationTokenId);

  await activation.activateUserByUserId(usedActivationToken.user_id);

  return response.status(200).json(usedActivationToken);
}
