import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { WebhookEvent } from "@clerk/backend";
// TODO: svix Webhook import 문제 해결 필요
// import { Webhook } from "svix";
const Webhook = null as any; // 임시 처리
import { transformWebhookData } from "./paymentAttemptTypes";

const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request);
    if (!event) {
      return new Response("Error occured", { status: 400 });
    }
    switch ((event as any).type) {
      case "user.created": // intentional fallthrough
      case "user.updated":
        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: event.data as any,
        });
        break;

      case "user.deleted": {
        const clerkUserId = (event.data as any).id!;
        await ctx.runMutation(internal.users.deleteFromClerk, { clerkUserId });
        break;
      }

      

      
      default:
        console.log("Ignored webhook event", (event as any).type);
    }

    return new Response(null, { status: 200 });
  }),
});

// Lemon Squeezy webhook handler
http.route({
  path: "/lemonsqueezy-webhook",
  method: "POST", 
  handler: httpAction(async (ctx, request) => {
    const event = await validateLemonSqueezyRequest(request);
    if (!event) {
      return new Response("Error occurred", { status: 400 });
    }

    const eventName = event.meta.event_name;
    console.log("Lemon Squeezy webhook event:", eventName);

    try {
      switch (eventName) {
        case "subscription_created":
          await ctx.runMutation(internal.lemonSqueezyWebhooks.handleSubscriptionCreated, {
            eventData: event,
          });
          break;

        case "subscription_updated":
          await ctx.runMutation(internal.lemonSqueezyWebhooks.handleSubscriptionUpdated, {
            eventData: event,
          });
          break;

        case "subscription_cancelled":
          await ctx.runMutation(internal.lemonSqueezyWebhooks.handleSubscriptionCancelled, {
            eventData: event,
          });
          break;

        case "subscription_resumed":
          await ctx.runMutation(internal.lemonSqueezyWebhooks.handleSubscriptionUpdated, {
            eventData: event,
          });
          break;

        case "subscription_expired":
          await ctx.runMutation(internal.lemonSqueezyWebhooks.handleSubscriptionUpdated, {
            eventData: event,
          });
          break;

        case "subscription_paused":
          await ctx.runMutation(internal.lemonSqueezyWebhooks.handleSubscriptionUpdated, {
            eventData: event,
          });
          break;

        case "subscription_unpaused":
          await ctx.runMutation(internal.lemonSqueezyWebhooks.handleSubscriptionUpdated, {
            eventData: event,
          });
          break;

        case "subscription_payment_success":
          console.log("Subscription payment successful for:", event.data.id);
          break;

        case "subscription_payment_failed":
          console.log("Subscription payment failed for:", event.data.id);
          break;

        case "order_created":
          await ctx.runMutation(internal.lemonSqueezyWebhooks.handleOrderCreated, {
            eventData: event,
          });
          break;

        case "order_refunded":
          await ctx.runMutation(internal.lemonSqueezyWebhooks.handleOrderUpdated, {
            eventData: event,
          });
          break;

        case "license_key_created":
          await ctx.runMutation(internal.lemonSqueezyWebhooks.handleLicenseCreated, {
            eventData: event,
          });
          break;

        case "license_key_updated":
          await ctx.runMutation(internal.lemonSqueezyWebhooks.handleLicenseUpdated, {
            eventData: event,
          });
          break;

        default:
          console.log("Ignored Lemon Squeezy webhook event:", eventName);
      }

      return new Response(null, { status: 200 });
    } catch (error) {
      console.error("Error processing Lemon Squeezy webhook:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
  const payloadString = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  try {
    return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
  } catch (error) {
    console.error("Error verifying webhook event", error);
    return null;
  }
}

async function validateLemonSqueezyRequest(req: Request): Promise<any | null> {
  const body = await req.text();
  const signature = req.headers.get("X-Signature");
  
  if (!signature) {
    console.error("Missing Lemon Squeezy signature");
    return null;
  }

  // Get webhook secret from environment
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Missing LEMONSQUEEZY_WEBHOOK_SECRET");
    return null;
  }

  try {
    // Basic signature verification using Web Crypto API
    // For production, implement proper HMAC-SHA256 verification
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const bodyData = encoder.encode(body);
    
    // Import the secret as a key for HMAC
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    // Generate expected signature
    const expectedSigBuffer = await crypto.subtle.sign("HMAC", key, bodyData);
    const expectedSigArray = new Uint8Array(expectedSigBuffer);
    const expectedSig = Array.from(expectedSigArray, byte => byte.toString(16).padStart(2, '0')).join('');
    
    // Extract signature from header (usually in format "sha256=...")
    const providedSig = signature.replace(/^sha256=/, '');
    
    // Compare signatures
    if (expectedSig !== providedSig) {
      console.error("Lemon Squeezy webhook signature verification failed");
      return null;
    }
    
    // Parse and return the event
    return JSON.parse(body);
  } catch (error) {
    console.error("Error verifying Lemon Squeezy webhook:", error);
    return null;
  }
}

export default http;