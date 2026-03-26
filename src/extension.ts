// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { getGitDiffs } from './diff';
import { extractModelChanges } from './parser';
import { generateSQL } from './sql';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	  const disposable = vscode.commands.registerCommand(
    "schemaql.generateMigration",
    async () => {
      const fileDiffs = getGitDiffs();
	  console.log("Git Diffs Start ------------:");
	  console.log("Git Diffs:", fileDiffs);
	  console.log("Git Diffs end ------------:");

      const modelChanges = extractModelChanges(fileDiffs);
      const sql = generateSQL(modelChanges);

      // Show result
      const doc = await vscode.workspace.openTextDocument({
        content: sql,
        language: "sql",
      });

      vscode.window.showTextDocument(doc);
    }
  );

  context.subscriptions.push(disposable);
}


// This method is called when your extension is deactivated
export function deactivate() {}
