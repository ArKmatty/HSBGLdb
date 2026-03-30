"use server";

import { supabase } from "@/lib/supabase";

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

    return { success: true };
  } catch (err) {
    console.error("[SocialAdmin] Unexpected error:", err);
    return { success: false, error: "Something went wrong." };
  }
}

export async function rejectSubmission(id: string) {
  try {
    const { error } = await supabase
      .from("social_submissions")
      .update({ status: "rejected" })
      .eq("id", id);

    if (error) {
      console.error("[SocialAdmin] Reject error:", error.message);
      return { success: false, error: "Failed to reject submission." };
    }

    return { success: true };
  } catch (err) {
    console.error("[SocialAdmin] Unexpected error:", err);
    return { success: false, error: "Something went wrong." };
  }
}

function buildPlatformUrl(platform: string, username: string): string {
  const lower = platform.toLowerCase();
  if (lower === "twitch") return `https://twitch.tv/${username}`;
  if (lower === "youtube") return `https://youtube.com/@${username}`;
  if (lower === "twitter" || lower === "x") return `https://x.com/${username}`;
  if (lower === "discord") return username;
  return `https://${lower}.com/${username}`;
}
