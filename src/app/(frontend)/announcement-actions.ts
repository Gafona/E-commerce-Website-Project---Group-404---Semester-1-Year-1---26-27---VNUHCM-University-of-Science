"use server"

import { getLiveAnnouncements, type LiveAnnouncement } from "@/lib/announcements"

// Loaded from the browser so prerendered pages still show current announcements.
export async function loadAnnouncementsAction(): Promise<LiveAnnouncement[]> {
  return getLiveAnnouncements()
}
