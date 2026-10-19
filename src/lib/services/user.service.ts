import { prisma } from '../prisma';
import type { NotificationPreferences } from '@/types/notifications';

export const userService = {
  async getProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  },

  async createProfile(userId: string, email: string, name: string) {
    return prisma.user.create({
      data: {
        id: userId,
        email,
        name,
      },
    });
  },

  async updateProfile(userId: string, data: { 
    name?: string; 
    defaultCurrency?: string; 
    theme?: string; 
    timezone?: string | null;
    notificationPreferences?: NotificationPreferences;
  }) {
    // Convert NotificationPreferences to Prisma-compatible JSON format
    const prismaData: Parameters<typeof prisma.user.update>[0]['data'] = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.defaultCurrency !== undefined && { defaultCurrency: data.defaultCurrency }),
      ...(data.theme !== undefined && { theme: data.theme }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
      ...(data.notificationPreferences !== undefined && { 
        notificationPreferences: data.notificationPreferences as unknown as Parameters<typeof prisma.user.update>[0]['data']['notificationPreferences']
      }),
    };

    return prisma.user.update({
      where: { id: userId },
      data: prismaData,
    });
  },

  /**
   * Dismiss notifications by adding their IDs to the user's dismissed list
   * Uses Prisma's push operation to add to the array without overwriting
   */
  async dismissNotifications(userId: string, notificationIds: string[]) {
    // Get current dismissed IDs to avoid duplicates
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dismissedNotifications: true },
    });

    const currentDismissed = user?.dismissedNotifications ?? [];
    const newIds = notificationIds.filter(id => !currentDismissed.includes(id));

    if (newIds.length === 0) {
      return user;
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        dismissedNotifications: {
          push: newIds,
        },
      },
    });
  },

  /**
   * Clear old dismissed notifications that are no longer relevant
   * This helps keep the array from growing indefinitely
   */
  async clearDismissedNotifications(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        dismissedNotifications: [],
      },
    });
  },
};
