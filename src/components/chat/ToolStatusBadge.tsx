"use client";

import { Loader2 } from "lucide-react";

export interface ToolPart {
  type: string;
  state: string;
  toolCallId: string;
  input?: {
    command?: string;
    path?: string;
    new_path?: string;
    [key: string]: unknown;
  };
}

interface ToolStatusBadgeProps {
  part: ToolPart;
}

function getToolMessage(
  toolName: string,
  isComplete: boolean,
  input?: ToolPart["input"]
): string {
  const command = input?.command;
  const path = input?.path;
  const newPath = input?.new_path;

  if (!input || !command) {
    return isComplete ? `Ran ${toolName}` : `Running ${toolName}`;
  }

  if (toolName === "str_replace_editor") {
    const target = path || "file";
    switch (command) {
      case "create":
        return isComplete ? `Created ${target}` : `Creating ${target}`;
      case "str_replace":
      case "insert":
        return isComplete ? `Edited ${target}` : `Editing ${target}`;
      case "view":
        return isComplete ? `Viewed ${target}` : `Viewing ${target}`;
      case "undo_edit":
        return isComplete ? `Reverted ${target}` : `Reverting ${target}`;
      default:
        return isComplete ? `Ran ${toolName}` : `Running ${toolName}`;
    }
  }

  if (toolName === "file_manager") {
    const target = path || "file";
    switch (command) {
      case "rename": {
        const suffix = newPath ? ` \u2192 ${newPath}` : "";
        return isComplete
          ? `Renamed ${target}${suffix}`
          : `Renaming ${target}${suffix}`;
      }
      case "delete":
        return isComplete ? `Deleted ${target}` : `Deleting ${target}`;
      default:
        return isComplete ? `Ran ${toolName}` : `Running ${toolName}`;
    }
  }

  return isComplete ? `Ran ${toolName}` : `Running ${toolName}`;
}

export function ToolStatusBadge({ part }: ToolStatusBadgeProps) {
  const isComplete = part.state === "output-available";
  const toolName = part.type.replace(/^tool-/, "");
  const message = getToolMessage(toolName, isComplete, part.input);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isComplete ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{message}</span>
    </div>
  );
}
