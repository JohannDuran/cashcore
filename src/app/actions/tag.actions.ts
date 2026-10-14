"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { sanitizeError } from "@/lib/utils";

export async function createTagAction(data: { name: string; color: string }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const tag = await prisma.tag.create({ data: { ...data, userId: user.id } });
    return { success: true, data: tag };
  } catch (error) {
    return { success: false, error: sanitizeError(error) };
  }
}

export async function updateTagAction(tagId: string, data: { name?: string; color?: string }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const tag = await prisma.tag.update({
      where: { id: tagId, userId: user.id },
      data,
    });
    return { success: true, data: tag };
  } catch (error) {
    return { success: false, error: sanitizeError(error) };
  }
}

export async function deleteTagAction(tagId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Desconectar de transacciones antes de eliminar
    await prisma.tag.update({
      where: { id: tagId, userId: user.id },
      data: { transactions: { set: [] } },
    });

    await prisma.tag.delete({ where: { id: tagId, userId: user.id } });
    return { success: true };
  } catch (error) {
    return { success: false, error: sanitizeError(error) };
  }
}
