import { execSync } from "child_process";
import * as vscode from "vscode";

export type ChangedFileDiff = {
  path: string;
  diff: string;
  isNewFile: boolean;
};

function parseLines(output: string): string[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function getGitDiffs(): ChangedFileDiff[] {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder open");
    return [];
  }

  const rootPath = workspaceFolders[0].uri.fsPath;

  try {
    const changedFilesOutput = execSync("git diff --name-only HEAD", {
      cwd: rootPath, // 🔥 THIS IS THE FIX
      encoding: "utf-8",
    });
    const untrackedFilesOutput = execSync(
      "git ls-files --others --exclude-standard",
      {
        cwd: rootPath,
        encoding: "utf-8",
      }
    );

    const changedFiles = new Set(parseLines(changedFilesOutput));
    const untrackedFiles = new Set(parseLines(untrackedFilesOutput));
    const allFiles = Array.from(new Set([...changedFiles, ...untrackedFiles]));

    return allFiles.map((path) => {
      const isNewFile = untrackedFiles.has(path);

      return {
        path,
        isNewFile,
        diff: isNewFile
          ? ""
          : execSync(`git diff HEAD -- "${path}"`, {
              cwd: rootPath,
              encoding: "utf-8",
            }),
      };
    });
  } catch (err) {
    console.error("Git diff failed", err);
    return [];
  }
}
