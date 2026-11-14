/**
 * Financial and currency formatting utilities for HRMS Payroll
 * Preserves exact numerical values while rendering standard currency notation.
 */

export const formatCurrency = (
  amount?: number | null,
  currency: string = 'USD',
): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (val?: number | null): string => {
  if (val === undefined || val === null || isNaN(val)) {
    return '0';
  }
  return new Intl.NumberFormat('en-US').format(val);
};

/**
 * Formula-injection safe CSV value sanitizer.
 * Prepends a single quote if the value begins with formula trigger characters: = + - @ \t \r
 */
export const sanitizeCsvValue = (val: unknown): string => {
  if (val === null || val === undefined) {
    return '';
  }
  let str = String(val);
  const formulaTriggers = ['=', '+', '-', '@', '\t', '\r'];
  if (str.length > 0 && formulaTriggers.includes(str[0])) {
    str = `'${str}`;
  }
  // Escape double quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Downloads a formula-safe CSV file in the browser.
 */
export const downloadCsv = (
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) => {
  const sanitizedHeaders = headers.map(sanitizeCsvValue).join(',');
  const sanitizedRows = rows
    .map((row) => row.map(sanitizeCsvValue).join(','))
    .join('\n');
  const csvContent = `\uFEFF${sanitizedHeaders}\n${sanitizedRows}`; // UTF-8 BOM for Excel compatibility

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    filename.endsWith('.csv') ? filename : `${filename}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
