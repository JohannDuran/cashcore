"use server";

import { getServerUser } from "@/lib/supabase/server";
import { userService } from "@/lib/services/user.service";
import { revalidatePath } from "next/cache";
import type { NotificationPreferences } from "@/types/notifications";

/**
 * Update notification preferences for the current user
 */
export async function updateNotificationPreferencesAction(
  preferences: NotificationPreferences
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getServerUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    await userService.updateProfile(user.id, {
      notificationPreferences: preferences,
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update notification preferences:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Get notification preferences for the current user
 */
export async function getNotificationPreferencesAction(): Promise<{
  success: boolean;
  preferences?: NotificationPreferences | null;
  error?: string;
}> {
  try {
    const user = await getServerUser();
    if (!user) {
      return { success: false, error: "No autenticado" };
    }

    const userData = await userService.getProfile(user.id);
    if (!userData) {
      return { success: false, error: "Usuario no encontrado" };
    }

    return {
      success: true,
      preferences: userData.notificationPreferences as NotificationPreferences | null,
    };
  } catch (error) {
    console.error("Failed to get notification preferences:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
