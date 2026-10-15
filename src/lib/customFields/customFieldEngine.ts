/**
 * Dynamic Custom Fields & Formula Engine (HappyTF Phase 11)
 * 
 * Provides runtime evaluation, validation, formatting, and columnar rollups
 * for user-definable columns (Currency, Rating, Checkbox, Dropdown, Formula, Number).
 */

import { BoardColumn, ColumnOption } from '../mondaydb/types';
import { BoardItem } from '../../types';
import { tokenizeFormula, FormulaParser, evaluateFormula, FormulaContext } from '../mondaydb/formulaEngine';

export const STARTER_CUSTOM_COLUMNS: BoardColumn[] = [
  {
    id: 'col-budget',
    title: 'Budget',
    type: 'currency',
    width: 120,
    description: 'Allocated budget or cost estimate',
    settings: {
      unit: '$',
      precision: 0,
      rollup: 'sum'
    }
  },
  {
    id: 'col-signoff',
    title: 'Client Sign-off',
    type: 'checkbox',
    width: 110,
    description: 'Stakeholder acceptance approval',
    settings: {
      rollup: 'count_checked'
    }
  },
  {
    id: 'col-rating',
    title: 'Impact Rating',
    type: 'rating',
    width: 130,
    description: 'Strategic value and priority impact (1-5 stars)',
    settings: {
      maxRating: 5,
      rollup: 'avg'
    }
  },
  {
    id: 'col-roi',
    title: 'Effort ROI',
    type: 'formula',
    width: 120,
    description: 'Dynamic return-on-investment calculated from Budget vs Story Points',
    settings: {
      formula: '{Budget} / ({Story Pts} * 100)',
      precision: 2,
      unit: 'x',
      rollup: 'avg'
    }
  }
];

export interface FormulaValidationResult {
  isValid: boolean;
  error?: string;
  variables: string[];
  sampleResult?: string | number | boolean;
}

/**
 * Validates formula expression syntax and returns extracted variables & preview result
 */
export function validateFormulaSyntax(
  formula: string,
  availableColumns: BoardColumn[] = [],
  sampleContext?: Record<string, any>
): FormulaValidationResult {
  const trimmed = formula ? formula.trim() : '';
  if (!trimmed) {
    return { isValid: false, error: 'Formula expression cannot be empty', variables: [] };
  }

  // Check variable bracket balancing: every '{' must have a matching '}'
  const openCount = (trimmed.match(/\{/g) || []).length;
  const closeCount = (trimmed.match(/\}/g) || []).length;
  if (openCount !== closeCount) {
    return { isValid: false, error: 'Unclosed variable bracket: missing closing "}"', variables: [] };
  }

  // Extract variables
  const variables: string[] = [];
  const varRegex = /\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = varRegex.exec(trimmed)) !== null) {
    const vName = match[1].trim();
    if (vName && !variables.includes(vName)) {
      variables.push(vName);
    }
  }

  try {
    const tokens = tokenizeFormula(trimmed);
    const parser = new FormulaParser(tokens);
    parser.parse();

    // Prepare evaluation context for sample calculation
    const testContext: FormulaContext = {
      'Story Pts': 5,
      'Points': 5,
      'Status': 'Working on it',
      'Priority': 'high',
      ...(sampleContext || {})
    };

    // Populate missing variables with dummy numbers
    variables.forEach((v) => {
      if (testContext[v] === undefined) {
        testContext[v] = 100;
      }
    });

    const sample = evaluateFormula(trimmed, testContext);

    return {
      isValid: true,
      variables,
      sampleResult: sample === '#ERROR' ? 0 : sample
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: err?.message || 'Invalid formula syntax',
      variables
    };
  }
}

/**
 * Builds standard + custom context for an item and evaluates all formula columns
 */
export function evaluateItemCustomFields(
  item: BoardItem,
  columns: BoardColumn[]
): Record<string, any> {
  const customValues = item.custom_values || {};
  const context: FormulaContext = {
    'Title': item.title,
    'Status': item.status,
    'Priority': item.priority,
    'Story Pts': typeof item.numbers_value === 'number' ? item.numbers_value : 5,
    'Points': typeof item.numbers_value === 'number' ? item.numbers_value : 5,
    'Duration': item.duration_days || 1,
    'Subtasks': (item.sub_items?.length || item.subtasks?.length || 0),
  };

  // Populate context with custom column values by both column id and column title
  columns.forEach((col) => {
    const rawVal = customValues[col.id];
    if (rawVal !== undefined) {
      context[col.id] = rawVal;
      context[col.title] = rawVal;
    } else {
      // Defaults if not set
      if (col.type === 'currency' || col.type === 'number') {
        context[col.id] = 0;
        context[col.title] = 0;
      } else if (col.type === 'checkbox') {
        context[col.id] = false;
        context[col.title] = false;
      } else if (col.type === 'rating') {
        context[col.id] = 0;
        context[col.title] = 0;
      }
    }
  });

  const computed: Record<string, any> = { ...customValues };

  // Evaluate each formula column
  columns.forEach((col) => {
    if (col.type === 'formula') {
      const formula = col.settings?.formula;
      if (formula) {
        try {
          const res = evaluateFormula(formula, context);
          if (res === '#ERROR') {
            computed[col.id] = 0;
          } else if (typeof res === 'number') {
            const precision = col.settings?.precision ?? 2;
            const factor = Math.pow(10, precision);
            computed[col.id] = Math.round(res * factor) / factor;
          } else {
            computed[col.id] = res;
          }
          // Also feed computed value back to context for chained formulas
          context[col.id] = computed[col.id];
          context[col.title] = computed[col.id];
        } catch {
          computed[col.id] = 0;
        }
      } else {
        computed[col.id] = 0;
      }
    }
  });

  return computed;
}

/**
 * Formats a custom field value for readable presentation
 */
export function formatCustomFieldValue(value: any, column: BoardColumn): string {
  if (value === undefined || value === null || value === '') {
    if (column.type === 'checkbox') return 'Pending';
    if (column.type === 'rating') return 'Unrated';
    return '—';
  }

  const { unit, precision = 0, options = [] } = column.settings || {};

  switch (column.type) {
    case 'currency': {
      const num = Number(value);
      if (isNaN(num)) return '—';
      const formattedNum = num.toLocaleString(undefined, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
      });
      return `${unit || '$'}${formattedNum}`;
    }

    case 'rating': {
      const num = Number(value) || 0;
      const max = column.settings?.maxRating || 5;
      return `${num} / ${max} ★`;
    }

    case 'checkbox': {
      return Boolean(value) ? 'Signed off' : 'Pending';
    }

    case 'dropdown': {
      const opt = options.find((o) => o.id === value || o.label === value);
      return opt ? opt.label : String(value);
    }

    case 'formula': {
      if (typeof value === 'number') {
        const p = column.settings?.precision ?? 2;
        const formattedNum = value.toFixed(p);
        return unit ? `${formattedNum}${unit}` : formattedNum;
      }
      return String(value);
    }

    case 'number': {
      const num = Number(value);
      if (isNaN(num)) return '—';
      return unit ? `${num}${unit}` : String(num);
    }

    default:
      return String(value);
  }
}

export interface RollupResult {
  value: number;
  formatted: string;
}

/**
 * Computes columnar aggregations across a list of items for group/board footers
 */
export function computeColumnRollup(column: BoardColumn, items: BoardItem[]): RollupResult {
  const rollupType = column.settings?.rollup;
  if (!rollupType || rollupType === 'none') {
    return { value: 0, formatted: '—' };
  }

  if (items.length === 0) {
    if (column.type === 'currency') {
      return { value: 0, formatted: `${column.settings?.unit || '$'}0` };
    }
    return { value: 0, formatted: '0' };
  }

  if (rollupType === 'count_checked' || column.type === 'checkbox') {
    let checkedCount = 0;
    items.forEach((item) => {
      const val = item.custom_values?.[column.id];
      if (Boolean(val)) checkedCount++;
    });
    const pct = Math.round((checkedCount / items.length) * 100);
    return {
      value: checkedCount,
      formatted: `${checkedCount} / ${items.length} (${pct}%)`
    };
  }

  // Gather numeric values for sum, avg, min, max
  const values: number[] = [];
  items.forEach((item) => {
    let val: any;
    if (column.type === 'formula') {
      const evaluated = evaluateItemCustomFields(item, [column]);
      val = evaluated[column.id];
    } else {
      val = item.custom_values?.[column.id];
    }

    if (typeof val === 'number' && !isNaN(val)) {
      values.push(val);
    } else if (val !== undefined && val !== null && !isNaN(Number(val))) {
      values.push(Number(val));
    }
  });

  if (values.length === 0) {
    return { value: 0, formatted: '0' };
  }

  switch (rollupType) {
    case 'sum': {
      const sum = values.reduce((acc, curr) => acc + curr, 0);
      const formatted = column.type === 'currency' 
        ? formatCustomFieldValue(sum, column) 
        : (column.settings?.unit ? `${sum}${column.settings.unit}` : sum.toLocaleString());
      return { value: sum, formatted };
    }

    case 'avg': {
      const sum = values.reduce((acc, curr) => acc + curr, 0);
      const avg = sum / values.length;
      if (column.type === 'rating') {
        const rounded = Math.round(avg * 10) / 10;
        return {
          value: rounded,
          formatted: `${rounded.toFixed(1)} / ${column.settings?.maxRating || 5} ★`
        };
      }
      const precision = column.settings?.precision ?? 1;
      const factor = Math.pow(10, precision);
      const rounded = Math.round(avg * factor) / factor;
      const formatted = column.type === 'currency'
        ? formatCustomFieldValue(rounded, column)
        : (column.settings?.unit ? `${rounded}${column.settings.unit}` : rounded.toFixed(precision));
      return { value: rounded, formatted };
    }

    case 'min': {
      const min = Math.min(...values);
      return { value: min, formatted: formatCustomFieldValue(min, column) };
    }

    case 'max': {
      const max = Math.max(...values);
      return { value: max, formatted: formatCustomFieldValue(max, column) };
    }

    default:
      return { value: 0, formatted: '—' };
  }
}

/**
 * Direct formula execution helper with custom context
 */
export function evaluateFormulaWithFallback(
  formula: string,
  context: Record<string, any> = {}
): string | number | boolean {
  try {
    const res = evaluateFormula(formula, context);
    return res === '#ERROR' ? 0 : res;
  } catch {
    return 0;
  }
}
