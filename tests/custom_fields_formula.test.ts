import { describe, it, expect } from 'vitest';
import { 
  STARTER_CUSTOM_COLUMNS,
  validateFormulaSyntax,
  evaluateItemCustomFields,
  formatCustomFieldValue,
  computeColumnRollup,
  evaluateFormulaWithFallback
} from '../src/lib/customFields/customFieldEngine';
import { BoardColumn } from '../src/lib/mondaydb/types';
import { BoardItem } from '../src/types';

describe('Custom Fields & Formula Engine (Phase 11)', () => {
  const mockColumns: BoardColumn[] = [
    {
      id: 'col-budget',
      title: 'Budget',
      type: 'currency',
      settings: { unit: '$', precision: 0, rollup: 'sum' }
    },
    {
      id: 'col-signoff',
      title: 'Client Sign-off',
      type: 'checkbox',
      settings: { rollup: 'count_checked' }
    },
    {
      id: 'col-rating',
      title: 'Impact Rating',
      type: 'rating',
      settings: { maxRating: 5, rollup: 'avg' }
    },
    {
      id: 'col-dept',
      title: 'Department',
      type: 'dropdown',
      settings: {
        options: [
          { id: 'opt-eng', label: 'Engineering', color: '#3b82f6' },
          { id: 'opt-qa', label: 'QA', color: '#10b981' },
          { id: 'opt-design', label: 'Design', color: '#f59e0b' }
        ]
      }
    },
    {
      id: 'col-roi',
      title: 'Effort ROI',
      type: 'formula',
      settings: {
        formula: '{Budget} / ({Story Pts} * 100)',
        precision: 2,
        unit: 'x',
        rollup: 'avg'
      }
    }
  ];

  const mockItems: BoardItem[] = [
    {
      id: 'item-1',
      board_id: 'board-01',
      group_id: 'grp-01',
      title: 'Core OCC Engine',
      status: 'Done',
      status_color: '#10b981',
      priority: 'urgent',
      due_date: '2026-10-20',
      numbers_value: 8,
      tags: ['backend'],
      activities: [],
      comments: [],
      version: 1,
      custom_values: {
        'col-budget': 2400,
        'col-signoff': true,
        'col-rating': 5,
        'col-dept': 'opt-eng'
      }
    },
    {
      id: 'item-2',
      board_id: 'board-01',
      group_id: 'grp-01',
      title: 'Interactive Gantt Timeline',
      status: 'Working on it',
      status_color: '#f59e0b',
      priority: 'high',
      due_date: '2026-10-22',
      numbers_value: 5,
      tags: ['ui'],
      activities: [],
      comments: [],
      version: 2,
      custom_values: {
        'col-budget': 1500,
        'col-signoff': false,
        'col-rating': 4,
        'col-dept': 'opt-design'
      }
    },
    {
      id: 'item-3',
      board_id: 'board-01',
      group_id: 'grp-01',
      title: 'Columnar WASM Analytics',
      status: 'Pending',
      status_color: '#64748b',
      priority: 'medium',
      due_date: '2026-10-25',
      numbers_value: 4,
      tags: ['wasm'],
      activities: [],
      comments: [],
      version: 1,
      custom_values: {
        'col-budget': 1200,
        'col-signoff': true,
        'col-rating': 3,
        'col-dept': 'opt-qa'
      }
    }
  ];

  describe('1. Starter Columns Catalog', () => {
    it('provides standard starter columns for boards', () => {
      expect(STARTER_CUSTOM_COLUMNS).toBeDefined();
      expect(STARTER_CUSTOM_COLUMNS.length).toBeGreaterThanOrEqual(4);
      
      const budgetCol = STARTER_CUSTOM_COLUMNS.find(c => c.type === 'currency');
      const checkCol = STARTER_CUSTOM_COLUMNS.find(c => c.type === 'checkbox');
      const ratingCol = STARTER_CUSTOM_COLUMNS.find(c => c.type === 'rating');
      const formulaCol = STARTER_CUSTOM_COLUMNS.find(c => c.type === 'formula');

      expect(budgetCol).toBeDefined();
      expect(checkCol).toBeDefined();
      expect(ratingCol).toBeDefined();
      expect(formulaCol).toBeDefined();
    });
  });

  describe('2. Formula Syntax Validator', () => {
    it('validates correct mathematical formulas', () => {
      const res = validateFormulaSyntax('{Budget} / ({Story Pts} * 100)', mockColumns);
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
      expect(res.variables).toContain('Budget');
      expect(res.variables).toContain('Story Pts');
    });

    it('detects unclosed variable brackets', () => {
      const res = validateFormulaSyntax('{Budget + 10', mockColumns);
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/bracket|unclosed/i);
    });

    it('evaluates preview calculation with mock values', () => {
      const res = validateFormulaSyntax('{Budget} * 1.2', mockColumns, { Budget: 1000 });
      expect(res.isValid).toBe(true);
      expect(res.sampleResult).toBe(1200);
    });
  });

  describe('3. Dynamic Formula Evaluation with Custom Values', () => {
    it('evaluates formula referencing item custom values and standard fields', () => {
      const computed1 = evaluateItemCustomFields(mockItems[0], mockColumns);
      // Item 1: Budget = 2400, Story Pts = 8 -> 2400 / (8 * 100) = 2400 / 800 = 3
      expect(computed1['col-roi']).toBe(3);

      const computed2 = evaluateItemCustomFields(mockItems[1], mockColumns);
      // Item 2: Budget = 1500, Story Pts = 5 -> 1500 / (5 * 100) = 1500 / 500 = 3
      expect(computed2['col-roi']).toBe(3);
    });

    it('safely handles divide-by-zero or missing values without throwing', () => {
      const emptyItem: BoardItem = {
        id: 'item-empty',
        board_id: 'board-01',
        group_id: 'grp-01',
        title: 'Zero points item',
        status: 'Pending',
        status_color: '#64748b',
        priority: 'low',
        due_date: '2026-10-30',
        numbers_value: 0,
        tags: [],
        activities: [],
        comments: [],
        custom_values: {
          'col-budget': 1000
        }
      };

      const result = evaluateItemCustomFields(emptyItem, mockColumns);
      expect(result['col-roi']).toBe(0); // Safely returns 0 on divide by zero
    });

    it('supports direct fallback evaluation for ad-hoc formulas', () => {
      const val = evaluateFormulaWithFallback('{Budget} - 200', { Budget: 1000 });
      expect(val).toBe(800);
    });
  });

  describe('4. Formatting Custom Field Values', () => {
    it('formats currency correctly with symbol and precision', () => {
      const budgetCol = mockColumns.find(c => c.id === 'col-budget')!;
      expect(formatCustomFieldValue(2400, budgetCol)).toBe('$2,400');
      expect(formatCustomFieldValue(undefined, budgetCol)).toBe('—');
    });

    it('formats rating values with stars', () => {
      const ratingCol = mockColumns.find(c => c.id === 'col-rating')!;
      expect(formatCustomFieldValue(4, ratingCol)).toBe('4 / 5 ★');
      expect(formatCustomFieldValue(undefined, ratingCol)).toBe('Unrated');
    });

    it('formats checkbox values', () => {
      const signoffCol = mockColumns.find(c => c.id === 'col-signoff')!;
      expect(formatCustomFieldValue(true, signoffCol)).toBe('Signed off');
      expect(formatCustomFieldValue(false, signoffCol)).toBe('Pending');
    });

    it('formats dropdown options with custom label', () => {
      const deptCol = mockColumns.find(c => c.id === 'col-dept')!;
      expect(formatCustomFieldValue('opt-eng', deptCol)).toBe('Engineering');
      expect(formatCustomFieldValue('unknown', deptCol)).toBe('unknown');
    });

    it('formats formula values with unit', () => {
      const roiCol = mockColumns.find(c => c.id === 'col-roi')!;
      expect(formatCustomFieldValue(3.25, roiCol)).toBe('3.25x');
    });
  });

  describe('5. Columnar Rollups & Aggregations', () => {
    it('computes sum rollup on numeric and currency columns', () => {
      const budgetCol = mockColumns.find(c => c.id === 'col-budget')!;
      const rollup = computeColumnRollup(budgetCol, mockItems);
      // 2400 + 1500 + 1200 = 5100
      expect(rollup.value).toBe(5100);
      expect(rollup.formatted).toBe('$5,100');
    });

    it('computes average rollup on rating and formula columns', () => {
      const ratingCol = mockColumns.find(c => c.id === 'col-rating')!;
      const rollup = computeColumnRollup(ratingCol, mockItems);
      // (5 + 4 + 3) / 3 = 4.0
      expect(rollup.value).toBe(4);
      expect(rollup.formatted).toBe('4.0 / 5 ★');
    });

    it('computes count_checked rollup on checkbox columns', () => {
      const signoffCol = mockColumns.find(c => c.id === 'col-signoff')!;
      const rollup = computeColumnRollup(signoffCol, mockItems);
      // 2 out of 3 checked
      expect(rollup.value).toBe(2);
      expect(rollup.formatted).toBe('2 / 3 (67%)');
    });

    it('handles empty item lists gracefully', () => {
      const budgetCol = mockColumns.find(c => c.id === 'col-budget')!;
      const rollup = computeColumnRollup(budgetCol, []);
      expect(rollup.value).toBe(0);
      expect(rollup.formatted).toBe('$0');
    });
  });
});
