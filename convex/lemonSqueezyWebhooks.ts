import { internalMutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import {
  lemonSqueezyWebhookEventValidator,
  transformSubscriptionData,
  transformOrderData,
  transformLicenseData,
} from "./lemonSqueezyTypes";

// Helper function to find user by Lemon Squeezy customer ID or email
async function findUserByCustomerData(ctx: QueryCtx, customerId: string, userEmail: string) {
  // First try to find by Lemon Squeezy customer ID
  const userByCustomerId = await ctx.db
    .query("users")
    .withIndex("byLemonSqueezyCustomerId", (q) => q.eq("lemonSqueezyCustomerId", customerId))
    .unique();
  
  if (userByCustomerId) {
    return userByCustomerId;
  }

  // If not found, try to find by external ID (Clerk user ID) in custom data
  // This requires the custom data to include the Clerk user ID
  // For now, we'll implement a basic email-based fallback
  
  // TODO: Implement proper custom data parsing to extract Clerk user ID
  // For production, ensure checkout process includes user mapping data
  console.log(`User not found for Lemon Squeezy customer ID: ${customerId}, email: ${userEmail}`);
  
  return null;
}

// Subscription webhooks
export const handleSubscriptionCreated = internalMutation({
  args: { eventData: lemonSqueezyWebhookEventValidator },
  returns: v.null(),
  handler: async (ctx, { eventData }) => {
    const subscriptionData = transformSubscriptionData(eventData.data);
    
    // Try to find user by custom data first (Clerk user ID)
    let user = null;
    if (eventData.meta.custom_data?.clerk_user_id) {
      user = await ctx.db
        .query("users")
        .withIndex("byExternalId", (q) => q.eq("externalId", eventData.meta.custom_data.clerk_user_id))
        .unique();
    }
    
    // Fallback to customer ID or email matching
    if (!user) {
      user = await findUserByCustomerData(
        ctx, 
        subscriptionData.lemonSqueezyCustomerId, 
        eventData.data.attributes.user_email
      );
    }

    // Check if subscription already exists
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("byLemonSqueezyId", (q) => 
        q.eq("lemonSqueezySubscriptionId", subscriptionData.lemonSqueezySubscriptionId)
      )
      .unique();

    if (!existingSubscription && user) {
      await ctx.db.insert("subscriptions", {
        userId: user._id,
        ...subscriptionData,
      });
      console.log(`Created subscription for user ${user._id}: ${subscriptionData.lemonSqueezySubscriptionId}`);
    } else if (!user) {
      console.error(`User not found for subscription creation: ${subscriptionData.lemonSqueezySubscriptionId}`);
    } else {
      console.log(`Subscription already exists: ${subscriptionData.lemonSqueezySubscriptionId}`);
    }

    // Update user's Lemon Squeezy customer ID if found
    if (user && !user.lemonSqueezyCustomerId) {
      await ctx.db.patch(user._id, {
        lemonSqueezyCustomerId: subscriptionData.lemonSqueezyCustomerId,
      });
      console.log(`Updated user ${user._id} with Lemon Squeezy customer ID: ${subscriptionData.lemonSqueezyCustomerId}`);
    }

    return null;
  },
});

export const handleSubscriptionUpdated = internalMutation({
  args: { eventData: lemonSqueezyWebhookEventValidator },
  returns: v.null(),
  handler: async (ctx, { eventData }) => {
    const subscriptionData = transformSubscriptionData(eventData.data);
    
    // Find existing subscription
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("byLemonSqueezyId", (q) => 
        q.eq("lemonSqueezySubscriptionId", subscriptionData.lemonSqueezySubscriptionId)
      )
      .unique();

    if (existingSubscription) {
      await ctx.db.patch(existingSubscription._id, subscriptionData);
    } else {
      // Create if doesn't exist
      const user = await findUserByCustomerData(
        ctx, 
        subscriptionData.lemonSqueezyCustomerId, 
        eventData.data.attributes.user_email
      );
      
      if (user) {
        await ctx.db.insert("subscriptions", {
          userId: user._id,
          ...subscriptionData,
        });
      }
    }

    return null;
  },
});

export const handleSubscriptionCancelled = internalMutation({
  args: { eventData: lemonSqueezyWebhookEventValidator },
  returns: v.null(),
  handler: async (ctx, { eventData }) => {
    const subscriptionData = transformSubscriptionData(eventData.data);
    
    // Find and update existing subscription
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("byLemonSqueezyId", (q) => 
        q.eq("lemonSqueezySubscriptionId", subscriptionData.lemonSqueezySubscriptionId)
      )
      .unique();

    if (existingSubscription) {
      await ctx.db.patch(existingSubscription._id, {
        ...subscriptionData,
        status: "cancelled",
      });
    }

    return null;
  },
});

// Order webhooks  
export const handleOrderCreated = internalMutation({
  args: { eventData: lemonSqueezyWebhookEventValidator },
  returns: v.null(),
  handler: async (ctx, { eventData }) => {
    const orderData = transformOrderData(eventData.data);
    
    // Try to find user by custom data first (Clerk user ID)
    let user = null;
    if (eventData.meta.custom_data?.clerk_user_id) {
      user = await ctx.db
        .query("users")
        .withIndex("byExternalId", (q) => q.eq("externalId", eventData.meta.custom_data.clerk_user_id))
        .unique();
    }
    
    // Fallback to customer ID or email matching
    if (!user) {
      user = await findUserByCustomerData(
        ctx, 
        orderData.lemonSqueezyCustomerId, 
        orderData.userEmail
      );
    }

    // Check if order already exists
    const existingOrder = await ctx.db
      .query("payments")
      .withIndex("byLemonSqueezyOrderId", (q) => 
        q.eq("lemonSqueezyOrderId", orderData.lemonSqueezyOrderId)
      )
      .unique();

    if (!existingOrder) {
      await ctx.db.insert("payments", {
        userId: user?._id,
        ...orderData,
      });
    }

    return null;
  },
});

export const handleOrderUpdated = internalMutation({
  args: { eventData: lemonSqueezyWebhookEventValidator },
  returns: v.null(),
  handler: async (ctx, { eventData }) => {
    const orderData = transformOrderData(eventData.data);
    
    // Find and update existing order
    const existingOrder = await ctx.db
      .query("payments")
      .withIndex("byLemonSqueezyOrderId", (q) => 
        q.eq("lemonSqueezyOrderId", orderData.lemonSqueezyOrderId)
      )
      .unique();

    if (existingOrder) {
      await ctx.db.patch(existingOrder._id, orderData);
    } else {
      // Create if doesn't exist
      const user = await findUserByCustomerData(
        ctx, 
        orderData.lemonSqueezyCustomerId, 
        orderData.userEmail
      );
      
      await ctx.db.insert("payments", {
        userId: user?._id,
        ...orderData,
      });
    }

    return null;
  },
});

// License webhooks
export const handleLicenseCreated = internalMutation({
  args: { eventData: lemonSqueezyWebhookEventValidator },
  returns: v.null(),
  handler: async (ctx, { eventData }) => {
    const licenseData = transformLicenseData(eventData.data);
    
    // Find user by customer ID or email  
    const user = await findUserByCustomerData(
      ctx, 
      licenseData.lemonSqueezyCustomerId, 
      eventData.data.attributes.user_email
    );

    // Check if license already exists
    const existingLicense = await ctx.db
      .query("licenses")
      .withIndex("byLemonSqueezyId", (q) => 
        q.eq("lemonSqueezyLicenseId", licenseData.lemonSqueezyLicenseId)
      )
      .unique();

    if (!existingLicense) {
      await ctx.db.insert("licenses", {
        userId: user?._id,
        ...licenseData,
      });
    }

    return null;
  },
});

export const handleLicenseUpdated = internalMutation({
  args: { eventData: lemonSqueezyWebhookEventValidator },
  returns: v.null(),
  handler: async (ctx, { eventData }) => {
    const licenseData = transformLicenseData(eventData.data);
    
    // Find and update existing license
    const existingLicense = await ctx.db
      .query("licenses")
      .withIndex("byLemonSqueezyId", (q) => 
        q.eq("lemonSqueezyLicenseId", licenseData.lemonSqueezyLicenseId)
      )
      .unique();

    if (existingLicense) {
      await ctx.db.patch(existingLicense._id, licenseData);
    } else {
      // Create if doesn't exist
      const user = await findUserByCustomerData(
        ctx, 
        licenseData.lemonSqueezyCustomerId, 
        eventData.data.attributes.user_email
      );
      
      await ctx.db.insert("licenses", {
        userId: user?._id,
        ...licenseData,
      });
    }

    return null;
  },
});