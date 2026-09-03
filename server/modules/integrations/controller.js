import { Router } from "express";
import { IntegrationValidationError, normalizeEmail, parseEmailSettingsInput, parseEmailTemplateInput, parseMelhorEnvioInput, parseResendInput, parseSmtpInput } from "./validation.js";
import { IntegrationError, buildMercadoPagoAuthorizationUrl, calculateFreight, createMercadoPagoAuthorization, decryptConfig, defaultTemplates, encryptConfig, getStoreSettings, getStorefrontIntegrationCapabilities, handleMercadoPagoCallback, publicFreightQuote, renderTemplate, saveEmailSettings, saveMelhorEnvioIntegration, saveResendIntegration, saveSmtpIntegration, sendStoreTransactionalEmail, sendTestEmail, testMelhorEnvioIntegration, testResendIntegration, testSmtpIntegration, updateEmailTemplate } from "./service.js";

export const integrationController = Router();
export const publicIntegrationRouter = Router();

function protectedHandler(handler) {
  return async (req, res, next) => {
    try {
      return res.json(await handler(req));
    } catch (error) {
      return next(error);
    }
  };
}

integrationController.get("/stores/:storeId/settings", protectedHandler((req) => getStoreSettings({ storeId: req.params.storeId, userId: req.user.id })));
integrationController.get("/stores/:storeId/storefront-capabilities", protectedHandler((req) => getStorefrontIntegrationCapabilities({ storeId: req.params.storeId, userId: req.user.id, contactEmail: req.user.email })));
integrationController.get("/stores/:storeId/integrations/mercado-pago/authorize", protectedHandler((req) => createMercadoPagoAuthorization({ storeId: req.params.storeId, userId: req.user.id })));
integrationController.put("/stores/:storeId/integrations/melhor-envio", protectedHandler((req) => saveMelhorEnvioIntegration({ storeId: req.params.storeId, userId: req.user.id, input: parseMelhorEnvioInput(req.body) })));
integrationController.post("/stores/:storeId/integrations/melhor-envio/test", protectedHandler((req) => testMelhorEnvioIntegration({ storeId: req.params.storeId, userId: req.user.id, contactEmail: req.user.email })));
integrationController.post("/stores/:storeId/integrations/melhor-envio/calculate", protectedHandler((req) => calculateFreight({ storeId: req.params.storeId, userId: req.user.id, contactEmail: req.user.email, source: req.body })));
integrationController.put("/stores/:storeId/integrations/resend", protectedHandler((req) => saveResendIntegration({ storeId: req.params.storeId, userId: req.user.id, input: parseResendInput(req.body) })));
integrationController.post("/stores/:storeId/integrations/resend/test", protectedHandler((req) => testResendIntegration({ storeId: req.params.storeId, userId: req.user.id })));
integrationController.put("/stores/:storeId/integrations/smtp", protectedHandler((req) => saveSmtpIntegration({ storeId: req.params.storeId, userId: req.user.id, input: parseSmtpInput(req.body) })));
integrationController.post("/stores/:storeId/integrations/smtp/test", protectedHandler((req) => testSmtpIntegration({ storeId: req.params.storeId, userId: req.user.id })));
integrationController.put("/stores/:storeId/email-settings", protectedHandler((req) => saveEmailSettings({ storeId: req.params.storeId, userId: req.user.id, input: parseEmailSettingsInput(req.body) })));
integrationController.put("/stores/:storeId/email-templates/:eventKey", protectedHandler((req) => updateEmailTemplate({ storeId: req.params.storeId, userId: req.user.id, eventKey: String(req.params.eventKey || ""), input: parseEmailTemplateInput(req.body) })));
integrationController.post("/stores/:storeId/email/test", protectedHandler((req) => {
  const recipient = normalizeEmail(req.body?.recipient);
  if (!recipient) throw new IntegrationValidationError(422, "Informe um e-mail de destino válido para o teste.");
  return sendTestEmail({ storeId: req.params.storeId, userId: req.user.id, recipient });
}));

publicIntegrationRouter.get("/integrations/mercado-pago/callback", async (req, res, next) => {
  try {
    const result = await handleMercadoPagoCallback({ state: String(req.query?.state || ""), code: String(req.query?.code || ""), providerError: String(req.query?.error || "") });
    return res.redirect(result.redirectUrl);
  } catch (error) {
    return next(error);
  }
});

function integrationErrorHandler(error, _req, res, next) {
  if (error instanceof IntegrationError || error instanceof IntegrationValidationError) return res.status(error.status).json({ error: error.message });
  return next(error);
}

integrationController.use(integrationErrorHandler);
publicIntegrationRouter.use(integrationErrorHandler);

export { buildMercadoPagoAuthorizationUrl, decryptConfig, defaultTemplates, encryptConfig, publicFreightQuote, renderTemplate, sendStoreTransactionalEmail };
export default integrationController;
