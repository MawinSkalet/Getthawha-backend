import express from "express";
import * as services from "../services/facebook.services";

const facebookRouter = express.Router();

// Webhook Verification (Handshake with Meta)
facebookRouter.get("/webhook", (req, res) => {
  services.verifyWebhook(req, res);
});

// Incoming message handler from Facebook Messenger
facebookRouter.post("/webhook", async (req, res) => {
  await services.handleWebhookEvent(req, res);
});

export default facebookRouter;
