import type { Prisma } from '@prisma/client';

/**
 * Cliente Prisma (raíz o transaccional) sobre el que se validan pertenencias.
 * `Prisma.TransactionClient` es estructuralmente compatible con `PrismaClient`.
 */
type Db = Prisma.TransactionClient;

export class AuthorizationError extends Error {
  readonly status = 403;

  constructor(message = 'Recurso no encontrado o no autorizado') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Valida que una wallet pertenezca al usuario autenticado.
 * No distingue entre "no existe" y "es de otro usuario" para evitar enumeración de recursos.
 */
export async function assertWalletOwnership(db: Db, userId: string, walletId: string): Promise<void> {
  const owned = await db.wallet.count({ where: { id: walletId, userId } });
  if (owned === 0) {
    throw new AuthorizationError('Wallet no encontrada o no autorizada');
  }
}

/**
 * Valida acceso a categoría: debe ser global (isDefault) o propia del usuario.
 */
export async function assertCategoryAccess(db: Db, userId: string, categoryId: string): Promise<void> {
  const accessible = await db.category.count({
    where: {
      id: categoryId,
      OR: [{ userId }, { isDefault: true }],
    },
  });
  if (accessible === 0) {
    throw new AuthorizationError('Categoría no encontrada o no autorizada');
  }
}

/**
 * Valida que todas las tags pertenezcan al usuario autenticado.
 */
export async function assertTagsOwnership(
  db: Db,
  userId: string,
  tagIds: readonly string[]
): Promise<void> {
  if (tagIds.length === 0) return;

  const uniqueIds = [...new Set(tagIds)];
  const owned = await db.tag.count({ where: { id: { in: uniqueIds }, userId } });
  if (owned !== uniqueIds.length) {
    throw new AuthorizationError('Etiquetas no encontradas o no autorizadas');
  }
}

/**
 * Valida que una deuda pertenezca al usuario autenticado.
 */
export async function assertDebtOwnership(db: Db, userId: string, debtId: string): Promise<void> {
  const owned = await db.debt.count({ where: { id: debtId, userId } });
  if (owned === 0) {
    throw new AuthorizationError('Deuda no encontrada o no autorizada');
  }
}

/**
 * Valida todas las referencias de una transacción (wallets/deudas, categoría y tags).
 * Centraliza el gate de autorización de recursos colaterales del payload del cliente.
 * 
 * El walletId puede ser un ID de Wallet o de Debt (para tarjetas de crédito/departamentales).
 */
export async function assertTransactionReferences(
  db: Db,
  userId: string,
  refs: {
    walletId: string;
    transferToWalletId?: string | null;
    categoryId: string;
    tagIds?: readonly string[];
  }
): Promise<void> {
  // walletId puede ser Wallet o Debt
  await assertWalletOrDebtOwnership(db, userId, refs.walletId);

  // transferToWalletId también puede ser Wallet o Debt
  if (refs.transferToWalletId) {
    await assertWalletOrDebtOwnership(db, userId, refs.transferToWalletId);
  }

  await assertCategoryAccess(db, userId, refs.categoryId);

  if (refs.tagIds?.length) {
    await assertTagsOwnership(db, userId, refs.tagIds);
  }
}

/**
 * Valida que un ID pertenezca al usuario, ya sea como Wallet o como Debt.
 * Útil para transacciones donde el origen/destino puede ser cualquiera de los dos.
 */
export async function assertWalletOrDebtOwnership(
  db: Db,
  userId: string,
  id: string
): Promise<'wallet' | 'debt'> {
  // Primero intentar como wallet
  const walletOwned = await db.wallet.count({ where: { id, userId } });
  if (walletOwned > 0) {
    return 'wallet';
  }

  // Si no es wallet, intentar como deuda
  const debtOwned = await db.debt.count({ where: { id, userId } });
  if (debtOwned > 0) {
    return 'debt';
  }

  throw new AuthorizationError('Cuenta no encontrada o no autorizada');
}

/**
 * Determina si un ID corresponde a una Wallet o Debt del usuario.
 * Devuelve el tipo y los datos básicos necesarios para operaciones.
 */
export async function resolveAccountType(
  db: Db,
  userId: string,
  id: string
): Promise<{ type: 'wallet' | 'debt'; id: string } | null> {
  const wallet = await db.wallet.findFirst({ where: { id, userId }, select: { id: true } });
  if (wallet) return { type: 'wallet', id: wallet.id };

  const debt = await db.debt.findFirst({ where: { id, userId }, select: { id: true } });
  if (debt) return { type: 'debt', id: debt.id };

  return null;
}
