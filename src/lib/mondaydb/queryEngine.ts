/**
 * mondayDB Architecture: Columnar Filter & Sort Query Engine
 * 
 * Supports multi-column dynamic filtering, text search, and sorting.
 * Can execute in-browser for 0ms optimistic queries or on server API routes.
 */

import { BoardItem } from '../../types';
import { FilterCondition, SortRule } from './types';

/**
 * Checks if an item satisfies a single condition
 */
export function matchesCondition(item: BoardItem, cond: FilterCondition): boolean {
  const { field, operator, value } = cond;
  
  // Extract field value
  let itemValue: unknown = undefined;
  if (field === 'status') itemValue = item.status;
  else if (field === 'priority') itemValue = item.priority;
  else if (field === 'title') itemValue = item.title;
  else if (field === 'assignee') itemValue = item.assignee?.name;
  else if (field === 'due_date') itemValue = item.due_date;
  else if (field === 'tags') itemValue = item.tags;
  else if (field in item) itemValue = (item as unknown as Record<string, unknown>)[field];

  if (operator === 'is_empty') {
    return itemValue === undefined || itemValue === null || itemValue === '' || (Array.isArray(itemValue) && itemValue.length === 0);
  }
  if (operator === 'is_not_empty') {
    return itemValue !== undefined && itemValue !== null && itemValue !== '' && (!Array.isArray(itemValue) || itemValue.length > 0);
  }

  const strItemVal = String(itemValue ?? '').toLowerCase();
  const strQueryVal = String(value ?? '').toLowerCase();

  switch (operator) {
    case 'equals':
      return strItemVal === strQueryVal;
    case 'not_equals':
      return strItemVal !== strQueryVal;
    case 'contains':
      if (Array.isArray(itemValue)) {
        return itemValue.some((v) => String(v).toLowerCase().includes(strQueryVal));
      }
      return strItemVal.includes(strQueryVal);
    case 'greater_than':
      return Number(itemValue) > Number(value);
    case 'less_than':
      return Number(itemValue) < Number(value);
    default:
      return true;
  }
}

/**
 * Filters items against an array of conditions (AND logic)
 */
export function filterItems(
  items: BoardItem[], 
  conditions: FilterCondition[], 
  searchQuery?: string
): BoardItem[] {
  return items.filter((item) => {
    // 1. Text search across title, tags, assignee
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const inTitle = item.title.toLowerCase().includes(q);
      const inTags = item.tags.some((t) => t.toLowerCase().includes(q));
      const inAssignee = item.assignee?.name.toLowerCase().includes(q);
      const inTicket = item.ticket_number?.toLowerCase().includes(q);
      if (!inTitle && !inTags && !inAssignee && !inTicket) {
        return false;
      }
    }

    // 2. Structured conditions
    for (const cond of conditions) {
      if (!matchesCondition(item, cond)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sorts items by a sort rule
 */
export function sortItems(items: BoardItem[], rule?: SortRule | null): BoardItem[] {
  if (!rule) return items;

  const { field, direction } = rule;
  const modifier = direction === 'asc' ? 1 : -1;

  return [...items].sort((a, b) => {
    let valA: unknown = undefined;
    let valB: unknown = undefined;

    if (field === 'title') {
      valA = a.title;
      valB = b.title;
    } else if (field === 'status') {
      valA = a.status;
      valB = b.status;
    } else if (field === 'priority') {
      const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      valA = priorityOrder[a.priority] || 0;
      valB = priorityOrder[b.priority] || 0;
    } else if (field === 'due_date') {
      valA = new Date(a.due_date).getTime() || 0;
      valB = new Date(b.due_date).getTime() || 0;
    } else if (field in a) {
      valA = (a as unknown as Record<string, unknown>)[field];
      valB = (b as unknown as Record<string, unknown>)[field];
    }

    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * modifier;
    }

    return String(valA ?? '').localeCompare(String(valB ?? '')) * modifier;
  });
}
