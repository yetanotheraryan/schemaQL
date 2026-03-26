import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { ChangedFileDiff } from "./diff";

export type FieldChange = {
  field: string;
  type: string;
};

export type ModelChange = {
  tableName: string;
  isNewModel: boolean;
  addedFields: FieldChange[];
};

function extractType(block: string): string | null {
  const typeMatch = block.match(
    /["'`]?type["'`]?\s*:\s*(?:DataTypes|Sequelize)\s*\.\s*([A-Za-z_]\w*(?:\s*\([^)]*\))?)/
  );

  if (!typeMatch) {
    return null;
  }

  return typeMatch[1].replace(/\s+/g, "");
}

function extractAddedFields(diff: string): FieldChange[] {
  const results: FieldChange[] = [];

  // Match lines like: + "newcol": {   OR   + newcol: {
  const fieldRegex = /^\+\s*["']?(\w+)["']?\s*:\s*{/gm;

  let match: RegExpExecArray | null;

  while ((match = fieldRegex.exec(diff)) !== null) {
    const field = match[1];

    // Look ahead from this position to find the type inside the block
    const startIndex = match.index;

    // Slice next ~200 chars (enough for small field blocks)
    const snippet = diff.slice(startIndex, startIndex + 200);

    const type = extractType(snippet);

    if (type) {
      results.push({
        field,
        type,
      });
    }
  }

  return results;
}

function extractFieldsFromContent(fileContent: string): FieldChange[] {
  const results: FieldChange[] = [];
  const initBodyMatch = fileContent.match(
    /\.init\s*\(\s*{([\s\S]*?)}\s*,\s*{/
  );

  if (!initBodyMatch) {
    return results;
  }

  const fieldBlock = initBodyMatch[1];
  const fieldRegex =
    /^\s*["'`]?([A-Za-z_]\w*)["'`]?\s*:\s*{\s*[\r\n]+([\s\S]*?)^\s*},?/gm;

  let match: RegExpExecArray | null;

  while ((match = fieldRegex.exec(fieldBlock)) !== null) {
    const field = match[1];
    const block = match[2];
    const type = extractType(block);

    if (type) {
      results.push({
        field,
        type,
      });
    }
  }

  return results;
}

function extractTableName(fileContent: string): string | null {
  const tableNameMatch = fileContent.match(
    /["'`]?tableName["'`]?\s*:\s*["'`]([^"'`]+)["'`]/i
  );
  return tableNameMatch?.[1] ?? null;
}

function extractModelName(fileContent: string): string | null {
  const modelNameMatch = fileContent.match(
    /["'`]?modelName["'`]?\s*:\s*["'`]([^"'`]+)["'`]/i
  );
  return modelNameMatch?.[1] ?? null;
}

function isNewModelFile(fileDiff: ChangedFileDiff): boolean {
  return fileDiff.isNewFile || /^new file mode /m.test(fileDiff.diff);
}

function getWorkspaceRoot(): string | null {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    return null;
  }

  return workspaceFolders[0].uri.fsPath;
}

export function extractModelChanges(fileDiffs: ChangedFileDiff[]): ModelChange[] {
  const rootPath = getWorkspaceRoot();

  if (!rootPath) {
    return [];
  }

  const modelChanges: ModelChange[] = [];

  for (const fileDiff of fileDiffs) {
    const fullPath = path.join(rootPath, fileDiff.path);

    if (!fs.existsSync(fullPath)) {
      continue;
    }

    const fileContent = fs.readFileSync(fullPath, "utf-8");
    const tableName = extractTableName(fileContent) ?? extractModelName(fileContent);
    const isNewModel = isNewModelFile(fileDiff);

    if (!tableName) {
      continue;
    }

    const relevantFields = isNewModel
      ? extractFieldsFromContent(fileContent)
      : extractAddedFields(fileDiff.diff);

    if (relevantFields.length === 0) {
      continue;
    }

    modelChanges.push({
      tableName,
      isNewModel,
      addedFields: relevantFields,
    });
  }

  return modelChanges;
}
