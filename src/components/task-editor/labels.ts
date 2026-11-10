import { differenceInCalendarDays, format } from "date-fns";
import { es } from "date-fns/locale";

/** "Hoy", "Mañana", "Pasado mañana", or a short date like "lun 16 nov". */
export function dayLabel(d: Date) {
  const diff = differenceInCalendarDays(d, new Date());
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === 2) return "Pasado mañana";
  return format(d, "EEE d MMM", { locale: es });
}
