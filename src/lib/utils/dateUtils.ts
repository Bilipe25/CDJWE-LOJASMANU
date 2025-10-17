/**
 * Utilitários para formatação de datas sem problemas de timezone
 * 
 * Quando o PostgreSQL retorna uma data do tipo DATE (ex: "2025-10-14"),
 * e o JavaScript tenta converter para Date object, pode haver conversão
 * de timezone que faz a data "voltar" um dia.
 * 
 * Estas funções fazem parse manual da string de data para evitar esse problema.
 */

/**
 * Formata uma data no formato YYYY-MM-DD para DD/MM/YYYY
 * @param dateString - String de data no formato YYYY-MM-DD
 * @returns Data formatada em DD/MM/YYYY
 */
export function formatDateBR(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  
  try {
    // Parse manual para evitar conversão de timezone
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Formata uma data no formato YYYY-MM-DD para DD/MM
 * @param dateString - String de data no formato YYYY-MM-DD
 * @returns Data formatada em DD/MM
 */
export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  
  try {
    // Parse manual para evitar conversão de timezone
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}/${month}`;
  } catch {
    return dateString;
  }
}

/**
 * Converte uma data local para string no formato YYYY-MM-DD
 * sem conversão de timezone
 * @param date - Date object
 * @returns String de data no formato YYYY-MM-DD
 */
export function dateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Cria um Date object a partir de uma string YYYY-MM-DD
 * sem problemas de timezone (meio-dia local)
 * @param dateString - String de data no formato YYYY-MM-DD
 * @returns Date object
 */
export function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}
