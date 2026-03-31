"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

interface SocialSubmission {
  playerName: string;
  platform: string;
  username: string;
  url?: string;
}

export async function submitSocialLink(data: SocialSubmission) {
  try {
    if (!data.playerName || !data.platform || !data.username) {
      return { success: false, error: "All fields are required." };
    }

    const url = data.url || buildPlatformUrl(data.platform, data.username);

    const { error } = await supabase
      .from("social_submissions")
      .insert({
        player_name: data.playerName,
        platform: data.platform,
        username: data.username,
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
    const { data, error } = await supabase
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
    const { data: submission, error: fetchError } = await supabase
      .from("social_submissions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !submission) {
      return { success: false, error: "Submission not found." };
    }

    const platformCol = submission.platform.toLowerCase();
    const { error: updateError } = await supabase
      .from("player_socials")
      .update({ [platformCol]: submission.username })
      .eq("accountid", submission.player_name);

    if (updateError) {
      console.error("[SocialAdmin] Update error:", updateError.message);
    }

    const { error: statusError } = await supabase
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
    const { error } = await supabase
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

  const cookieStore = await cookies();
  cookieStore.set("admin_auth", ADMIN_SECRET, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });

  return { success: true };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_auth");
  return { success: true };
}

async function isAdminAuthenticated(): Promise<boolean> {
  if (!ADMIN_SECRET) return false;
  const cookieStore = await cookies();
  const auth = cookieStore.get("admin_auth");
  return auth?.value === ADMIN_SECRET;
}

function buildPlatformUrl(platform: string, username: string): string {
  const lower = platform.toLowerCase();
  if (lower === "twitch") return `https://twitch.tv/${username}`;
  if (lower === "youtube") return `https://youtube.com/@${username}`;
  if (lower === "twitter" || lower === "x") return `https://x.com/${username}`;
  if (lower === "discord") return username;
  return `https://${lower}.com/${username}`;
}
