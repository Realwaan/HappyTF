/**
 * mondayDB Architecture: Core Type Definitions
 * Shared types for the isomorphic calculation, filtering, and aggregation engine.
 */

export type ColumnType = 
  | 'text' 
  | 'status' 
  | 'people' 
  | 'date' 
  | 'timeline' 
  | 'numbers' 
  | 'priority' 
  | 'formula' 
  | 'subitems' 
  | 'tags';

export interface ColumnOption {
  id: string;
  label: string;
  color: string;
}

export interface BoardColumn {
  id: string;
  title: string;
  type: ColumnType;
  width?: number;
  settings?: {
    options?: ColumnOption[];
    unit?: string; // e.g. '$', 'h', 'pts'
    formula?: string; // e.g. '{Estimate} - {Spent}' or '{Numbers} * 1.2'
    precision?: number;
  };
}

export interface SubItem {
  id: string;
  parent_id: string;
  title: string;
  status: 'Working on it' | 'Done' | 'Stuck' | 'In Review' | 'Pending';
  status_color: string;
  assignee?: {
    id: string;
    name: string;
    avatar: string;
  };
  due_date?: string;
  number_val?: number;
  completed: boolean;
}

export interface Folder {
  id: string;
  workspace_id: string;
  name: string;
  color?: string;
  parent_folder_id?: string | null;
  collapsed?: boolean;
}

export interface StatusBatterySegment {
  label: string;
  color: string;
  count: number;
  percentage: number;
}

export interface GroupAggregation {
  groupId: string;
  itemCount: number;
  subItemCount: number;
  subItemsCompleted: number;
  subItemProgressPercent: number;
  statusBattery: StatusBatterySegment[];
  numbersSum: number;
  numbersAvg: number;
  timelineSpan?: {
    earliest: string;
    latest: string;
    days: number;
  };
}

export interface BoardAggregation {
  totalItems: number;
  totalSubItems: number;
  totalSubItemsCompleted: number;
  overallProgressPercent: number;
  statusBattery: StatusBatterySegment[];
  totalNumbersSum: number;
  averageNumbers: number;
}

export type FilterOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'greater_than' 
  | 'less_than' 
  | 'is_empty' 
  | 'is_not_empty';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean;
}

export interface SortRule {
  field: string;
  direction: 'asc' | 'desc';
}
