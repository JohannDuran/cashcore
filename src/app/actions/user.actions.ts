"use server";

import { userService } from "@/lib/services/user.service";
import { createClient } from "@/lib/supabase/server";
import { sanitizeError } from "@/lib/utils";
import logger from "@/lib/logger";

export async function updateProfileAction(data: {
  name?: string;
  defaultCurrency?: string;
  timezone?: string | null;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const updated = await userService.updateProfile(user.id, data);
    return { success: true, data: updated };
  } catch (error) {
    logger.error({ err: error }, "updateProfileAction failed");
    return { success: false, error: sanitizeError(error) };
  }
}
