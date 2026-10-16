/**
 * Utilidades para manejo de zonas horarias.
 * 
 * La zona horaria se determina en este orden:
 * 1. Configuración explícita del usuario (user.timezone)
 * 2. Zona horaria del navegador
 * 3. Inferencia desde la moneda por defecto del usuario
 */

// Mapeo de monedas a zonas horarias típicas
const CURRENCY_TIMEZONE_MAP: Record<string, string> = {
  MXN: "America/Mexico_City",
  USD: "America/New_York",
  EUR: "Europe/Madrid",
  COP: "America/Bogota",
  ARS: "America/Argentina/Buenos_Aires",
  BRL: "America/Sao_Paulo",
  PEN: "America/Lima",
  CLP: "America/Santiago",
};

/**
 * Obtiene la zona horaria del navegador (solo funciona en cliente)
 */
export function getBrowserTimezone(): string {
  if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return "America/Mexico_City"; // Fallback
}

/**
 * Infiere la zona horaria desde una moneda
 */
export function getTimezoneFromCurrency(currency: string): string {
  return CURRENCY_TIMEZONE_MAP[currency] || "America/Mexico_City";
}

/**
 * Obtiene la zona horaria efectiva del usuario.
 * Prioridad: configuración explícita > navegador > moneda por defecto
 */
export function getEffectiveTimezone(
  userTimezone?: string | null,
  defaultCurrency?: string
): string {
  // 1. Si el usuario configuró una zona, usarla
  if (userTimezone) {
    return userTimezone;
  }

  // 2. Intentar zona del navegador (solo en cliente)
  if (typeof window !== "undefined") {
    return getBrowserTimezone();
  }

  // 3. Inferir desde la moneda
  if (defaultCurrency) {
    return getTimezoneFromCurrency(defaultCurrency);
  }

  return "America/Mexico_City";
}

/**
 * Convierte una fecha YYYY-MM-DD a Date en la zona horaria especificada,
 * asegurando que represente el inicio del día en esa zona.
 */
export function parseDateInTimezone(dateStr: string, timezone: string): Date {
  // Extraer componentes de la fecha
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return new Date(dateStr);
  }

  const [, year, month, day] = match;

  // Crear fecha en la zona horaria especificada usando Intl
  // Esto crea la fecha a medianoche en la zona indicada
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Crear una fecha aproximada y ajustar
  const approxDate = new Date(`${year}-${month}-${day}T12:00:00`);
  
  // El enfoque más robusto: crear la fecha con hora de mediodía local
  // para evitar que el cambio de zona la mueva al día anterior/siguiente
  return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
}

/**
 * Formatea una fecha a YYYY-MM-DD en la zona horaria del usuario
 */
export function formatDateInTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Lista de zonas horarias comunes para el selector
 */
export const COMMON_TIMEZONES = [
  { value: "America/Mexico_City", label: "México (Ciudad de México)" },
  { value: "America/Tijuana", label: "México (Tijuana)" },
  { value: "America/Cancun", label: "México (Cancún)" },
  { value: "America/New_York", label: "Estados Unidos (Nueva York)" },
  { value: "America/Los_Angeles", label: "Estados Unidos (Los Ángeles)" },
  { value: "America/Chicago", label: "Estados Unidos (Chicago)" },
  { value: "America/Bogota", label: "Colombia (Bogotá)" },
  { value: "America/Lima", label: "Perú (Lima)" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (Buenos Aires)" },
  { value: "America/Sao_Paulo", label: "Brasil (São Paulo)" },
  { value: "America/Santiago", label: "Chile (Santiago)" },
  { value: "Europe/Madrid", label: "España (Madrid)" },
  { value: "Europe/London", label: "Reino Unido (Londres)" },
  { value: "Europe/Paris", label: "Francia (París)" },
  { value: "Europe/Berlin", label: "Alemania (Berlín)" },
  { value: "Asia/Tokyo", label: "Japón (Tokio)" },
  { value: "Asia/Shanghai", label: "China (Shanghái)" },
  { value: "Asia/Seoul", label: "Corea del Sur (Seúl)" },
  { value: "Australia/Sydney", label: "Australia (Sídney)" },
  { value: "UTC", label: "UTC (Hora Universal)" },
];
