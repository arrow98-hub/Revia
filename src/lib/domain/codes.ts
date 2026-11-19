/** Normaliza a A–Z: quita tildes, convierte ñ→N y elimina todo lo demás. */
export function lettersOnly(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/**
 * Prefijo de 4 letras: 2 del nombre + 2 del primer apellido.
 * "Jane" "Doe" → "JADO". Si falta alguna letra se rellena con X ("Li" "O" → "LIOX").
 */
export function buildCodePrefix(firstName: string, lastName: string): string {
  const first = lettersOnly(firstName.trim().split(/\s+/)[0] ?? "");
  const last = lettersOnly(lastName.trim().split(/\s+/)[0] ?? "");
  return (first.slice(0, 2).padEnd(2, "X") + last.slice(0, 2).padEnd(2, "X")).slice(0, 4);
}

export function formatProductCode(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(5, "0")}`;
}
