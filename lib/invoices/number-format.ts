import { getIstDateParts } from './ist-date';

export class InvoiceNumberFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvoiceNumberFormatError';
  }
}

type TokenType = 'literal' | 'seq' | 'fy' | 'fyyyy' | 'yyyy' | 'yy' | 'mm' | 'dd';

interface Token {
  type: TokenType;
  value?: string;
  width?: number;
}

const ALLOWED_LITERAL_REGEX = /^[A-Za-z0-9\-/]+$/;

export function parseInvoiceNumberFormat(format: string): { tokens: Token[] } {
  if (!format) {
    throw new InvoiceNumberFormatError("Format string cannot be empty.");
  }

  const tokens: Token[] = [];
  let currentLiteral = "";
  
  let i = 0;
  while (i < format.length) {
    if (format[i] === '{') {
      if (currentLiteral) {
        if (!ALLOWED_LITERAL_REGEX.test(currentLiteral)) {
          throw new InvoiceNumberFormatError(`Invalid literal characters found. Only letters, numbers, hyphens, and slashes are allowed outside placeholders. Found: "${currentLiteral}"`);
        }
        tokens.push({ type: 'literal', value: currentLiteral });
        currentLiteral = "";
      }
      
      const endIndex = format.indexOf('}', i);
      if (endIndex === -1) {
        throw new InvoiceNumberFormatError("Unclosed placeholder brace '{' found.");
      }
      
      const placeholder = format.substring(i + 1, endIndex);
      if (placeholder.startsWith('SEQ:')) {
        const widthStr = placeholder.substring(4);
        const width = parseInt(widthStr, 10);
        if (isNaN(width) || widthStr !== String(width) || width < 1 || width > 6) {
          throw new InvoiceNumberFormatError(`Invalid sequence placeholder "{SEQ:${widthStr}}". Width must be a single digit from 1 to 6.`);
        }
        tokens.push({ type: 'seq', width });
      } else if (placeholder === 'FY') {
        tokens.push({ type: 'fy', width: 5 });
      } else if (placeholder === 'FYYYY') {
        tokens.push({ type: 'fyyyy', width: 7 });
      } else if (placeholder === 'YYYY') {
        tokens.push({ type: 'yyyy', width: 4 });
      } else if (placeholder === 'YY') {
        tokens.push({ type: 'yy', width: 2 });
      } else if (placeholder === 'MM') {
        tokens.push({ type: 'mm', width: 2 });
      } else if (placeholder === 'DD') {
        tokens.push({ type: 'dd', width: 2 });
      } else {
        throw new InvoiceNumberFormatError(`Unrecognized placeholder "{${placeholder}}".`);
      }
      
      i = endIndex + 1;
    } else {
      currentLiteral += format[i];
      i++;
    }
  }
  
  if (currentLiteral) {
    if (!ALLOWED_LITERAL_REGEX.test(currentLiteral)) {
      throw new InvoiceNumberFormatError(`Invalid literal characters found. Only letters, numbers, hyphens, and slashes are allowed outside placeholders. Found: "${currentLiteral}"`);
    }
    tokens.push({ type: 'literal', value: currentLiteral });
  }

  return { tokens };
}

export function validateInvoiceNumberFormat(format: string): { valid: true; maxResolvedLength: number } | { valid: false; error: string } {
  try {
    const { tokens } = parseInvoiceNumberFormat(format);
    
    let seqCount = 0;
    let maxResolvedLength = 0;
    
    for (const token of tokens) {
      if (token.type === 'seq') {
        seqCount++;
        maxResolvedLength += token.width || 0;
      } else if (token.type === 'literal') {
        maxResolvedLength += token.value?.length || 0;
      } else {
        maxResolvedLength += token.width || 0;
      }
    }
    
    if (seqCount === 0) {
      return { valid: false, error: "Format must include exactly one {SEQ:N} counter placeholder." };
    }
    if (seqCount > 1) {
      return { valid: false, error: "Format can only include one counter placeholder." };
    }
    
    if (maxResolvedLength > 16) {
      return { valid: false, error: `This format resolves to ${maxResolvedLength} characters, which exceeds the 16-character legal limit under CGST Rule 46(b). Shorten it by ${maxResolvedLength - 16} character(s).` };
    }
    
    return { valid: true, maxResolvedLength };
  } catch (error) {
    if (error instanceof InvoiceNumberFormatError) {
      return { valid: false, error: error.message };
    }
    return { valid: false, error: "An unknown error occurred while validating the format." };
  }
}

export function getResetGranularity(format: string): 'daily' | 'monthly' | 'yearly' {
  // Granularity is intentionally based only on {DD}/{MM} presence, NOT on {YYYY}/{YY}/{FY}/{FYYYY} — those are display-only tokens.
  // The actual reset boundary is always anchored to the financial year (the legally mandated reset point),
  // further subdivided by month/day only if those tokens are present.
  // This keeps the underlying counter's reset boundary decoupled from which year-label style the user chooses to display.
  try {
    const { tokens } = parseInvoiceNumberFormat(format);
    const hasDD = tokens.some(t => t.type === 'dd');
    if (hasDD) return 'daily';
    const hasMM = tokens.some(t => t.type === 'mm');
    if (hasMM) return 'monthly';
    return 'yearly';
  } catch (error) {
    // If format is invalid, fallback to yearly
    return 'yearly';
  }
}

export function getPeriodKey(granularity: 'daily' | 'monthly' | 'yearly', financialYearId: string, invoiceDate: Date): string {
  if (granularity === 'yearly') {
    return financialYearId;
  }
  
  const { year, month, day } = getIstDateParts(invoiceDate);
  const yyyy = year;
  const mm = String(month).padStart(2, '0');
  
  if (granularity === 'monthly') {
    return `${financialYearId}:${yyyy}-${mm}`;
  }
  
  const dd = String(day).padStart(2, '0');
  return `${financialYearId}:${yyyy}-${mm}-${dd}`;
}

export function resolveInvoiceNumber(format: string, params: { invoiceDate: Date; fyLabel: string; sequenceValue: number }): string {
  const { tokens } = parseInvoiceNumberFormat(format);
  
  const { invoiceDate, fyLabel, sequenceValue } = params;
  
  const { year, month, day } = getIstDateParts(invoiceDate);
  const dateYear = year;
  const dateMonth = String(month).padStart(2, '0');
  const dateDay = String(day).padStart(2, '0');
  const dateYearShort = String(dateYear).slice(-2);

  let result = "";
  
  for (const token of tokens) {
    switch (token.type) {
      case 'literal':
        result += token.value || "";
        break;
      case 'seq':
        const w = token.width || 4;
        result += String(sequenceValue).padStart(w, '0');
        break;
      case 'fy':
        result += fyLabel.slice(2);
        break;
      case 'fyyyy':
        result += fyLabel;
        break;
      case 'yyyy':
        result += String(dateYear);
        break;
      case 'yy':
        result += dateYearShort;
        break;
      case 'mm':
        result += dateMonth;
        break;
      case 'dd':
        result += dateDay;
        break;
    }
  }
  
  return result;
}
