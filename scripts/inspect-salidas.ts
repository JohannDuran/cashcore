import { prisma } from '../src/lib/prisma';

async function main() {
  const budgets = await prisma.budget.findMany({ orderBy: { createdAt: 'desc' } });
  const cats = await prisma.category.findMany();
  const catMap = new Map(cats.map(c => [c.id, c.name]));

  const wallets = await prisma.wallet.findMany();
  const walletMap = new Map(wallets.map(w => [w.id, w.name]));
  const debts = await prisma.debt.findMany();
  const debtMap = new Map(debts.map(d => [d.id, d.name]));
  const accName = (id?: string | null) => id ? (walletMap.get(id) || debtMap.get(id) || id) : null;

  const txs = await prisma.transaction.findMany({ where: { type: 'expense' }, orderBy: { date: 'desc' } });

  for (const b of budgets) {
    const startDate = new Date(b.startDate);
    const now = new Date();
    let endDate = now;
    if (b.endDate) {
      const parsedEnd = new Date(b.endDate);
      endDate = parsedEnd < now ? parsedEnd : now;
    }

    const matching = txs.filter(
      (t) =>
        t.type === 'expense' &&
        b.categoryIds.includes(t.categoryId) &&
        new Date(t.date) >= startDate &&
        new Date(t.date) <= endDate &&
        (b.walletIds.length === 0 ||
          (t.walletId && b.walletIds.includes(t.walletId)) ||
          (t.debtId && b.walletIds.includes(t.debtId)))
    );

    console.log('════════════════════════════════════════════');
    console.log('BUDGET:', b.name, '| spent:', matching.reduce((s, t) => s + t.amount, 0));
    console.log('  categorias:', b.categoryIds.map(id => catMap.get(id) || id).join(', '));
    console.log('  cuentas   :', b.walletIds.map(id => accName(id)).join(', '));
    console.log('  TRANSACCIONES QUE CUENTAN:');
    for (const t of matching) {
      console.log(
        `    - ${t.amount.toString().padStart(8)} | ${(catMap.get(t.categoryId) || t.categoryId).padEnd(14)} | ${String(t.date).slice(0,10)} | cuenta: ${accName(t.walletId) || accName(t.debtId)} | ${t.description}`
      );
    }
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
