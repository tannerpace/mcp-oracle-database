/**
 * Type definitions for schema discovery tools
 */

export interface TableInfo {
  tableName: string;
  rowCount: number;
  lastModified?: string;
  tablespace?: string;
  comments?: string;
}

export interface ColumnInfo {
  columnName: string;
  dataType: string;
  nullable: boolean;
  dataLength?: number;
  dataPrecision?: number;
  dataScale?: number;
  defaultValue?: string;
  comments?: string;
}

export interface ConstraintInfo {
  constraintName: string;
  constraintType: string;
  columns: string[];
  searchCondition?: string;
  refTableName?: string;
  refColumns?: string[];
}

export interface ForeignKeyRelation {
  constraintName: string;
  fromTable: string;
  fromColumns: string[];
  toTable: string;
  toColumns: string[];
  deleteRule?: string;
}

export interface TableRelations {
  tableName: string;
  foreignKeys: ForeignKeyRelation[];
  referencedBy: ForeignKeyRelation[];
}

export interface SampleValue {
  columnName: string;
  sampleValues: any[];
  distinctCount?: number;
  nullCount?: number;
}

export interface RelatedTableHint {
  tableName: string;
  relationshipType: 'foreign_key' | 'naming_pattern' | 'shared_columns';
  confidence: number;
  description: string;
}
