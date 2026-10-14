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
 * Valida todas las referencias de una transacción (wallets, categoría y tags).
 * Centraliza el gate de autorización de recursos colaterales del payload del cliente.
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
  await assertWalletOwnership(db, userId, refs.walletId);

  if (refs.transferToWalletId) {
    await assertWalletOwnership(db, userId, refs.transferToWalletId);
  }

  await assertCategoryAccess(db, userId, refs.categoryId);

  if (refs.tagIds?.length) {
    await assertTagsOwnership(db, userId, refs.tagIds);
  }
}
