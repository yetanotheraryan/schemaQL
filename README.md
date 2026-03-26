# schemaQL
<p align="center">
  <img src="./assets/icon.png" width="120" />
</p>

schemaQL is a VS Code extension that turns Sequelize model changes into SQL migration statements.

Instead of manually writing migration SQL after every model update, you can run one command and let schemaQL inspect your changed model files, detect schema additions, and generate the SQL for you in a new editor tab.

## What It Does

schemaQL reads your current git changes and looks for Sequelize model updates.

It currently handles:

- New model files and generates `CREATE TABLE`
- New columns added to existing models and generates `ALTER TABLE ... ADD COLUMN`
- Table name resolution from `tableName`
- Fallback to `modelName` when `tableName` is missing
- Sequelize types like `INTEGER`, `BOOLEAN`, `STRING`, `STRING(300)`, `DECIMAL(10,2)`
- Null handling from `allowNull: true` and `allowNull: false`
- Multiple changed models in the same run

## How It Works

When you run the command, schemaQL:

1. Reads changed and untracked files from your git workspace
2. Finds Sequelize model files that contain schema additions
3. Detects whether a model is new or already existed
4. Extracts table name from `tableName` or `modelName`
5. Reads column types and nullability from the model definition
6. Generates SQL and opens it in a VS Code editor

## Example

Given a Sequelize model like this:

```ts
newtable.init(
  {
    name: {
      type: DataTypes.STRING(300),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "newtable",
  }
);
```

schemaQL generates SQL like:

```sql
CREATE TABLE newtable (
  name VARCHAR(300) NOT NULL,
  isActive BOOLEAN NULL
);
```

If you add a new column to an existing model:

```ts
newcol: {
  type: DataTypes.STRING(300),
  allowNull: false,
}
```

schemaQL generates:

```sql
ALTER TABLE your_table ADD COLUMN newcol VARCHAR(300) NOT NULL;
```

## Supported Rules

### Table name

- Use `tableName` if present in the model options
- If `tableName` is missing, use `modelName`

### Type mapping

- `DataTypes.STRING` -> `VARCHAR(255)`
- `DataTypes.STRING(300)` -> `VARCHAR(300)`
- `DataTypes.CHAR(10)` -> `CHAR(10)`
- `DataTypes.INTEGER` -> `INT`
- `DataTypes.BOOLEAN` -> `BOOLEAN`
- `DataTypes.DECIMAL(10,2)` -> `DECIMAL(10,2)`

### Null handling

- `allowNull: false` -> `NOT NULL`
- `allowNull: true` -> `NULL`
- If `allowNull` is omitted, schemaQL leaves nullability unspecified

## Command

Open the Command Palette in VS Code and run:

```text
schemaQL: Generate Migration
```

Command id:

```text
schemaql.generateMigration
```

## Requirements

- A VS Code workspace must be open
- Your project should use Sequelize-style models
- The extension reads from git changes, so your schema updates should exist in the current working tree

## Current Scope

schemaQL is focused on generating SQL for added schema elements.

It is currently designed for:

- New model creation
- New columns added to existing models

It does not yet fully handle:

- Column removal
- Column rename detection
- Type changes on existing columns
- Constraint generation beyond basic nullability
- Complex model definitions that do not follow standard Sequelize `Model.init(...)` structure

## Why Use It

schemaQL speeds up a repetitive part of backend work:

- Fewer manual migration mistakes
- Faster feedback while editing models
- Easier review of schema intent
- Useful when working on multiple model updates together


## License

[MIT](./LICENSE)
