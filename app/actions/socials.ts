"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import crypto from "crypto";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

const COOKIE_NAME = "admin_auth";
const SESSION_TTL = 60 * 60 * 24; // 24 hours

const socialSubmissionSchema = z.object({
  playerName: z.string().min(1, "Player name is required").max(100, "Player name is too long"),
  platform: z.enum(["twitch", "twitter", "youtube", "discord", "other"]),
  username: z.string().min(1, "Username is required").max(100, "Username is too long").regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  url: z.string().url("Invalid URL format").optional().or(z.literal("")),
});

function signSessionToken(secret: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(16).toString("hex");
  const payload = `${timestamp}:${random}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function verifySessionToken(token: string, secret: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = `${parts[0]}.${parts[1]}`;
    const signature = parts[2];
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const timestamp = parseInt(parts[0], 10);
    if (isNaN(timestamp)) return false;
    if (Date.now() - timestamp > SESSION_TTL * 1000) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

interface SocialSubmission {
  playerName: string;
  platform: string;
  username: string;
  url?: string;
}

export async function submitSocialLink(data: SocialSubmission) {
  try {
    const validated = socialSubmissionSchema.safeParse(data);
    
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || "Invalid input";
      return { success: false, error: firstError };
    }

    const sanitizedUsername = validated.data.username.replace(/[<>"'&]/g, "").trim();
    if (!sanitizedUsername) {
      return { success: false, error: "Username contains invalid characters." };
    }

    const url = validated.data.url || buildPlatformUrl(validated.data.platform, sanitizedUsername);

    const { error } = await supabaseAdmin
      .from("social_submissions")
      .insert({
        player_name: data.playerName,
        platform: data.platform,
        username: sanitizedUsername,
        url,
        status: "pending",
      });

    if (error) {
      console.error("[SocialSubmit] Supabase error:", error.message);
      return { success: false, error: "Failed to submit. Please try again." };
    }

    return { success: true };
  } catch (err) {
    console.error("[SocialSubmit] Unexpected error:", err);
    return { success: false, error: "Something went wrong." };
  }
}

export async function getPendingSubmissions() {
  if (!await isAdminAuthenticated()) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("social_submissions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[SocialAdmin] Fetch error:", error.message);
      return { success: false, error: "Failed to fetch submissions." };
    }

    return { success: true, submissions: data || [] };
  } catch (err) {
    console.error("[SocialAdmin] Unexpected error:", err);
    return { success: false, error: "Something went wrong." };
  }
}

export async function approveSubmission(id: string) {
  if (!await isAdminAuthenticated()) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from("social_submissions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !submission) {
      return { success: false, error: "Submission not found." };
    }

    const platformCol = submission.platform.toLowerCase();
    const { error: updateError } = await supabaseAdmin
      .from("player_socials")
      .update({ [platformCol]: submission.username })
      .eq("accountid", submission.player_name);

    if (updateError) {
      console.error("[SocialAdmin] Update error:", updateError.message);
    }

    const { error: statusError } = await supabaseAdmin
      .from("social_submissions")
      .update({ status: "approved" })
      .eq("id", id);

    if (statusError) {
      console.error("[SocialAdmin] Status error:", statusError.message);
      return { success: false, error: "Failed to update status." };
    }

    revalidatePath("/admin/socials");
    return { success: true };
  } catch (err) {
    console.error("[SocialAdmin] Unexpected error:", err);
    return { success: false, error: "Something went wrong." };
  }
}

export async function rejectSubmission(id: string) {
  if (!await isAdminAuthenticated()) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const { error } = await supabaseAdmin
      .from("social_submissions")
      .update({ status: "rejected" })
      .eq("id", id);

    if (error) {
      console.error("[SocialAdmin] Reject error:", error.message);
      return { success: false, error: "Failed to reject submission." };
    }

    revalidatePath("/admin/socials");
    return { success: true };
  } catch (err) {
    console.error("[SocialAdmin] Unexpected error:", err);
    return { success: false, error: "Something went wrong." };
  }
}

export async function loginAdmin(password: string) {
  if (!ADMIN_SECRET) {
    return { success: false, error: "Admin secret not configured." };
  }

  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (attempt && attempt.lockedUntil > now) {
    const remaining = Math.ceil((attempt.lockedUntil - now) / 1000 / 60);
    return { success: false, error: `Too many attempts. Try again in ${remaining}m.` };
  }

  if (password !== ADMIN_SECRET) {
    const newCount = (attempt?.count || 0) + 1;
    if (newCount >= MAX_ATTEMPTS) {
      loginAttempts.set(ip, { count: newCount, lockedUntil: now + LOCKOUT_MS });
      return { success: false, error: `Too many attempts. Locked for 15 minutes.` };
    }
    loginAttempts.set(ip, { count: newCount, lockedUntil: attempt?.lockedUntil || 0 });
    return { success: false, error: `Wrong password. ${MAX_ATTEMPTS - newCount} attempts remaining.` };
  }

  loginAttempts.delete(ip);

  const token = signSessionToken(ADMIN_SECRET);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL,
    path: "/",
  });

  return { success: true };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return { success: true };
}

async function isAdminAuthenticated(): Promise<boolean> {
  if (!ADMIN_SECRET) return false;
  const cookieStore = await cookies();
  const auth = cookieStore.get(COOKIE_NAME);
  if (!auth?.value) return false;
  return verifySessionToken(auth.value, ADMIN_SECRET);
}

function buildPlatformUrl(platform: string, username: string): string {
  const lower = platform.toLowerCase();
  if (lower === "twitch") return `https://twitch.tv/${username}`;
  if (lower === "youtube") return `https://youtube.com/@${username}`;
  if (lower === "twitter" || lower === "x") return `https://x.com/${username}`;
  if (lower === "discord") return username;
  return `https://${lower}.com/${username}`;
}
