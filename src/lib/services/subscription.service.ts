import { prisma } from '../prisma';

export const subscriptionService = {
  async getSubscriptions(userId: string) {
    return prisma.subscription.findMany({
      where: { userId },
      include: { category: true, wallet: true },
      orderBy: { nextBillDate: 'asc' },
    });
  },

  async createSubscription(userId: string, data: any) {
    const { categoryId, walletId, userId: _userId, ...rest } = data;
    return prisma.subscription.create({
      data: {
        ...rest,
        user: { connect: { id: userId } },
        category: { connect: { id: categoryId } },
        ...(walletId && { wallet: { connect: { id: walletId } } }),
      },
    });
  },

  async updateSubscription(userId: string, subscriptionId: string, data: any) {
    const { categoryId, walletId, userId: _userId, ...rest } = data;
    return prisma.subscription.update({
      where: { id: subscriptionId, userId },
      data: {
        ...rest,
        ...(categoryId && { category: { connect: { id: categoryId } } }),
        wallet: walletId ? { connect: { id: walletId } } : { disconnect: true },
      },
    });
  },

  async deleteSubscription(userId: string, subscriptionId: string) {
    return prisma.subscription.delete({
      where: { id: subscriptionId, userId },
    });
  }
};
