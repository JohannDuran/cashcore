import { prisma } from '../prisma';

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

  async updateProfile(userId: string, data: { name?: string; defaultCurrency?: string; theme?: string; timezone?: string | null }) {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  }
};
