import { FieldChange, ModelChange } from "./parser";

function mapType(tsType: string): string {
  const typeMatch = tsType.match(/^(\w+)(?:\(([^)]*)\))?$/);

  if (!typeMatch) {
    return "TEXT";
  }

  const [, baseTypeRaw, typeArgs] = typeMatch;
  const baseType = baseTypeRaw.toUpperCase();

  switch (baseType) {
    case "INTEGER":
    case "BIGINT":
    case "SMALLINT":
    case "TINYINT":
    case "NUMBER":
      return "INT";
    case "FLOAT":
    case "DOUBLE":
    case "REAL":
      return typeArgs ? `${baseType}(${typeArgs})` : baseType;
    case "DECIMAL":
      return typeArgs ? `DECIMAL(${typeArgs})` : "NUMERIC";
    case "STRING":
      return typeArgs ? `VARCHAR(${typeArgs})` : "VARCHAR(255)";
    case "TEXT":
      return "TEXT";
    case "CHAR":
      return typeArgs ? `CHAR(${typeArgs})` : "CHAR";
    case "UUID":
    case "DATE":
    case "DATEONLY":
    case "JSON":
    case "JSONB":
      return "TEXT";
    case "ENUM":
      return typeArgs ? `TEXT /* ENUM(${typeArgs}) */` : "TEXT";
    case "BOOLEAN":
    case "BOOL":
      return "BOOLEAN";
    default:
      return "TEXT";
  }
}

function mapNullability(field: FieldChange): string {
  if (field.allowNull === true) {
    return " NULL";
  }

  if (field.allowNull === false) {
    return " NOT NULL";
  }

  return "";
}

function generateStatements(table: string, addedFields: FieldChange[]): string {
  if (addedFields.length === 0) {
    return "";
  }

  return addedFields
    .map(
      (f) =>
        `ALTER TABLE ${table} ADD COLUMN ${f.field} ${mapType(f.type)}${mapNullability(f)};`
    )
    .join("\n");
}

function generateCreateTableStatement(
  table: string,
  fields: FieldChange[]
): string {
  if (fields.length === 0) {
    return "";
  }

  const columns = fields
    .map(
      (field) =>
        `  ${field.field} ${mapType(field.type)}${mapNullability(field)}`
    )
    .join(",\n");

  return `CREATE TABLE ${table} (\n${columns}\n);`;
}

export function generateSQL(modelChanges: ModelChange[]): string {
  const statements = modelChanges
    .map((modelChange) =>
      modelChange.isNewModel
        ? generateCreateTableStatement(
            modelChange.tableName,
            modelChange.addedFields
          )
        : generateStatements(modelChange.tableName, modelChange.addedFields)
    )
    .filter(Boolean);

  if (statements.length === 0) {
    return "-- No changes detected";
  }

  return statements.join("\n\n");
}
