"use server";

import { categoryService } from "@/lib/services/category.service";
import { createClient } from "@/lib/supabase/server";
import { sanitizeError } from "@/lib/utils";

export async function createCategoryAction(data: {
  name: string;
  icon: string;
  color: string;
  type: "income" | "expense";
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const category = await categoryService.createCustomCategory(user.id, data);
    return { success: true, data: category };
  } catch (error) {
    return { success: false, error: sanitizeError(error) };
  }
}

export async function deleteCategoryAction(categoryId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await categoryService.deleteCustomCategory(user.id, categoryId);
    return { success: true };
  } catch (error) {
    return { success: false, error: sanitizeError(error) };
  }
}
