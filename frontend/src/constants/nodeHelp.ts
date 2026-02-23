/**
 * Shared help content for pipeline nodes: brief descriptions (Add Node dropdown popup)
 * and full editor help (operation + field descriptions in NodeConfigPanel).
 */

export const TRANSFORM_LABELS: Record<string, string> = {
  select: 'Select Columns',
  filter: 'Filter Rows',
  groupby: 'Group By',
  join: 'Join Tables',
  sort: 'Sort Data',
  rename: 'Rename Columns',
  calculate: 'Calculate Column',
};

/** One-line description for the Add Node dropdown popup */
export const TRANSFORM_BRIEF: Record<string, string> = {
  select: 'Keep or drop columns from your table.',
  filter: 'Keep only rows that meet a condition (e.g. status = Active).',
  groupby: 'Group rows and compute sums, averages, or counts per group.',
  join: 'Merge two tables by matching values in a column.',
  sort: 'Reorder rows by a column (A–Z or Z–A).',
  rename: 'Change column names without changing the data.',
  calculate: 'Add a new column from a formula using existing columns.',
};

/** One-line description for ML steps in Add Node dropdown */
export const ML_BRIEF: Record<string, string> = {
  ml_regression: 'Predict a numeric value from other columns.',
  ml_classification: 'Predict a category or label from other columns.',
  ml_clustering: 'Group rows into similar clusters (no target column).',
};

export interface EditorFieldHelp {
  name: string;
  description: string;
}

export interface EditorHelp {
  description: string;
  fields: EditorFieldHelp[];
}

/** Full help for the node editor: description + field meanings */
export const TRANSFORM_EDITOR_HELP: Record<string, EditorHelp> = {
  select: {
    description: 'Keep only the columns you need. Uncheck columns to drop them; leave all unchecked to keep every column.',
    fields: [
      { name: 'Select columns', description: 'Check the columns you want to keep in the table. Leave all unchecked to keep all columns.' },
    ],
  },
  filter: {
    description: 'Keep only rows that meet a condition (e.g. status equals "Active", or amount greater than 100).',
    fields: [
      { name: 'Column', description: 'The column to check (e.g. Status, Amount).' },
      { name: 'Operator', description: 'How to compare: Equals, Not equals, Greater than, Less than, or Contains.' },
      { name: 'Value', description: 'The value to compare against. Rows that match stay; others are removed.' },
    ],
  },
  groupby: {
    description: 'Group rows by one or more columns, then compute totals (sum, average, count, etc.) for each group.',
    fields: [
      { name: 'Group by columns', description: 'Choose which columns define the groups (e.g. Region, Category). Each unique combination becomes one row.' },
      { name: 'Aggregations', description: 'For each numeric column, choose an operation (Sum, Mean, Count, Min, Max) and give the result a name (alias).' },
    ],
  },
  join: {
    description: 'Merge two tables by matching values in a column (e.g. combine Orders with Customers on customer_id).',
    fields: [
      { name: 'Join type', description: 'Inner = only rows that match in both tables. Left = all from first table plus matches from second. Right and Outer include more rows from one or both sides.' },
      { name: 'Right table', description: 'The second table to merge. You can also connect another dataset using the node\'s right input handle.' },
      { name: 'Left column / Right column', description: 'The column in each table used to match rows (e.g. customer_id in both).' },
    ],
  },
  sort: {
    description: 'Reorder rows by a column (e.g. newest first, or A–Z by name).',
    fields: [
      { name: 'Column', description: 'The column to sort by.' },
      { name: 'Order', description: 'Ascending (A→Z, 0→9) or Descending (Z→A, 9→0).' },
    ],
  },
  rename: {
    description: 'Give columns new, clearer names without changing the data.',
    fields: [
      { name: 'Column renames', description: 'Add a row for each column you want to rename. The left side shows the current name; type the new name on the right.' },
    ],
  },
  calculate: {
    description: 'Create a new column from a formula using existing columns (e.g. total = price × quantity).',
    fields: [
      { name: 'New column name', description: 'The name for the new column.' },
      { name: 'Expression', description: 'The formula. Use column names as-is (e.g. price * quantity or revenue - cost).' },
    ],
  },
};

export const ML_EDITOR_HELP: Record<string, EditorHelp> = {
  ml_regression: {
    description: 'Predict a numeric value from other columns (e.g. predict sales from price and region).',
    fields: [
      { name: 'Target column', description: 'The numeric column you want to predict.' },
      { name: 'Feature columns', description: 'The columns used as inputs for the prediction.' },
    ],
  },
  ml_classification: {
    description: 'Predict a category or label from other columns (e.g. yes/no, or type A/B/C).',
    fields: [
      { name: 'Target column', description: 'The column containing the category you want to predict.' },
      { name: 'Feature columns', description: 'The columns used as inputs for the prediction.' },
    ],
  },
  ml_clustering: {
    description: 'Group rows into clusters based on similarity (no target column; the model finds patterns).',
    fields: [
      { name: 'Feature columns', description: 'The columns used to measure similarity. Rows with similar values are grouped together.' },
      { name: 'Number of clusters', description: 'How many groups to create.' },
    ],
  },
};

export function getOperationDisplayName(op: string): string {
  if (TRANSFORM_LABELS[op]) return TRANSFORM_LABELS[op];
  return op.replace('ml_', '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getEditorHelp(op: string): EditorHelp | null {
  return TRANSFORM_EDITOR_HELP[op] ?? ML_EDITOR_HELP[op] ?? null;
}
