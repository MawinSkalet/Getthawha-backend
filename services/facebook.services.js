import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

/**
 * Verification Handshake for Meta Webhook
 */
function verifyWebhook(req, res) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.FB_VERIFY_TOKEN || "getthawha_fb_secret_2026";

  if (mode && token) {
    if (mode === "subscribe" && token === verifyToken) {
      console.log("Facebook Webhook Verified Successfully!");
      return res.status(200).send(challenge);
    } else {
      console.error("Facebook Webhook Verification Failed: Tokens do not match.");
      return res.sendStatus(403);
    }
  }

  return res.sendStatus(400);
}

/**
 * Send message to a Facebook user via Graph API
 */
async function sendTextMessage(recipientId, text) {
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageAccessToken) {
    console.error("FB_PAGE_ACCESS_TOKEN is missing in environment variables.");
    return;
  }

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
      {
        recipient: { id: recipientId },
        message: { text: text },
      }
    );
    console.log(`[FB Bot] Text message sent to ${recipientId}, message_id: ${res.data?.message_id}`);
  } catch (error) {
    console.error("[FB Bot] Error sending Facebook message:", JSON.stringify(error.response?.data || error.message));
  }
}

/**
 * Send Quick Reply buttons to a user
 */
async function sendQuickReply(recipientId) {
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageAccessToken) return;

  const clientUrl = process.env.CLIENT_URL || "https://getthawha.com";

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`,
      {
        recipient: { id: recipientId },
        messaging_type: "RESPONSE",
        message: {
          text: "สวัสดีครับ ยินดีต้อนรับสู่ เก็ดถะหวา นวดเพื่อสุขภาพ & สปา 🌸\nต้องการสอบถามข้อมูลด้านใดดีครับ?",
          quick_replies: [
            {
              content_type: "text",
              title: "🌸 เมนูบริการ & ราคา",
              payload: "SERVICES_PAYLOAD",
            },
            {
              content_type: "text",
              title: "📍 ดูพิกัดสาขา",
              payload: "BRANCHES_PAYLOAD",
            },
            {
              content_type: "text",
              title: "📅 จองคิวออนไลน์",
              payload: "BOOKING_PAYLOAD",
            },
          ],
        },
      }
    );
    console.log(`[FB Bot] Quick reply sent to ${recipientId}, message_id: ${res.data?.message_id}`);
  } catch (error) {
    console.error("[FB Bot] Error sending quick reply:", JSON.stringify(error.response?.data || error.message));
  }
}

/**
 * Process incoming Webhook events from Facebook Messenger
 */
async function handleWebhookEvent(req, res) {
  const body = req.body;

  if (body.object === "page") {
    // Return 200 immediately to acknowledge Meta within 200ms
    res.status(200).send("EVENT_RECEIVED");

    for (const entry of body.entry || []) {
      const messagingEvents = entry.messaging || [];
      for (const webhookEvent of messagingEvents) {
        const senderPsid = webhookEvent.sender?.id;
        if (!senderPsid) continue;

        // Ignore echo messages (messages sent by the page/bot itself)
        if (webhookEvent.message?.is_echo) {
          continue;
        }

        console.log(`[FB Bot] Received event from Sender PSID: ${senderPsid}`);

        // Extract message text or quick reply / postback payload
        const messageText = (webhookEvent.message?.text || "").toLowerCase();
        const payload = webhookEvent.message?.quick_reply?.payload || webhookEvent.postback?.payload || "";

        // If user tapped a button or sent a text message
        if (webhookEvent.message || webhookEvent.postback) {
          if (
            payload === "SERVICES_PAYLOAD" ||
            messageText.includes("ราคา") ||
            messageText.includes("บริการ") ||
            messageText.includes("นวด") ||
            messageText.includes("คอร์ส") ||
            messageText.includes("menu") ||
            messageText.includes("price") ||
            messageText.includes("service")
          ) {
            await sendTextMessage(
              senderPsid,
              "🌸 บริการยอดนิยมของเก็ดถะหวา:\n• นวดไทยโบราณ (Thai Massage) - เริ่มต้น 450฿/ชม.\n• นวดอโรม่า (Aroma Therapy) - เริ่มต้น 750฿/ชม.\n• นวดประคบสมุนไพร (Herbal Compress) - เริ่มต้น 650฿/ชม.\n\nดูรายละเอียดเพิ่มเติมและโปรโมชันได้ที่: https://getthawha.com/services"
            );
            await sendQuickReply(senderPsid);
          } else if (
            payload === "BRANCHES_PAYLOAD" ||
            messageText.includes("สาขา") ||
            messageText.includes("พิกัด") ||
            messageText.includes("ที่อยู่") ||
            messageText.includes("แผนที่") ||
            messageText.includes("location") ||
            messageText.includes("branch")
          ) {
            await sendTextMessage(
              senderPsid,
              "📍 สาขาของเก็ดถะหวาเปิดให้บริการ 10:00 - 22:00 น.\nสามารถดูพิกัดและเส้นทาง Google Maps ได้ที่: https://getthawha.com/location"
            );
            await sendQuickReply(senderPsid);
          } else if (
            payload === "BOOKING_PAYLOAD" ||
            messageText.includes("จอง") ||
            messageText.includes("คิว") ||
            messageText.includes("book")
          ) {
            await sendTextMessage(
              senderPsid,
              "📅 สามารถตรวจสอบเวลาว่างและจองคิวออนไลน์ได้ทันทีที่นี่ครับ:\n👉 https://getthawha.com/booking"
            );
            await sendQuickReply(senderPsid);
          } else {
            // Default greeting (e.g. GET_STARTED, hello, etc.)
            await sendQuickReply(senderPsid);
          }
        }
      }
    }
  } else {
    res.sendStatus(404);
  }
}

export { verifyWebhook, handleWebhookEvent, sendTextMessage, sendQuickReply };
