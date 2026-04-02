import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolStatusBadge, ToolPart } from "../ToolStatusBadge";

afterEach(() => {
  cleanup();
});

function makePart(overrides: Partial<ToolPart> = {}): ToolPart {
  return {
    type: "tool-str_replace_editor",
    state: "output-available",
    toolCallId: "test-id",
    input: { command: "create", path: "/components/Card.jsx" },
    ...overrides,
  };
}

// --- str_replace_editor complete states ---

test("shows 'Created' for str_replace_editor create command", () => {
  render(<ToolStatusBadge part={makePart()} />);
  expect(screen.getByText("Created /components/Card.jsx")).toBeDefined();
});

test("shows 'Edited' for str_replace_editor str_replace command", () => {
  render(
    <ToolStatusBadge
      part={makePart({ input: { command: "str_replace", path: "/App.jsx" } })}
    />
  );
  expect(screen.getByText("Edited /App.jsx")).toBeDefined();
});

test("shows 'Edited' for str_replace_editor insert command", () => {
  render(
    <ToolStatusBadge
      part={makePart({ input: { command: "insert", path: "/App.jsx" } })}
    />
  );
  expect(screen.getByText("Edited /App.jsx")).toBeDefined();
});

test("shows 'Viewed' for str_replace_editor view command", () => {
  render(
    <ToolStatusBadge
      part={makePart({ input: { command: "view", path: "/App.jsx" } })}
    />
  );
  expect(screen.getByText("Viewed /App.jsx")).toBeDefined();
});

test("shows 'Reverted' for str_replace_editor undo_edit command", () => {
  render(
    <ToolStatusBadge
      part={makePart({ input: { command: "undo_edit", path: "/App.jsx" } })}
    />
  );
  expect(screen.getByText("Reverted /App.jsx")).toBeDefined();
});

// --- str_replace_editor pending states ---

test("shows 'Creating' for pending create command", () => {
  render(
    <ToolStatusBadge
      part={makePart({
        state: "input-available",
        input: { command: "create", path: "/App.jsx" },
      })}
    />
  );
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
});

test("shows 'Editing' for pending str_replace command", () => {
  render(
    <ToolStatusBadge
      part={makePart({
        state: "input-available",
        input: { command: "str_replace", path: "/App.jsx" },
      })}
    />
  );
  expect(screen.getByText("Editing /App.jsx")).toBeDefined();
});

test("shows 'Viewing' for pending view command", () => {
  render(
    <ToolStatusBadge
      part={makePart({
        state: "input-available",
        input: { command: "view", path: "/App.jsx" },
      })}
    />
  );
  expect(screen.getByText("Viewing /App.jsx")).toBeDefined();
});

// --- file_manager complete states ---

test("shows 'Renamed' with arrow for file_manager rename", () => {
  render(
    <ToolStatusBadge
      part={makePart({
        type: "tool-file_manager",
        input: { command: "rename", path: "/old.jsx", new_path: "/new.jsx" },
      })}
    />
  );
  expect(screen.getByText("Renamed /old.jsx \u2192 /new.jsx")).toBeDefined();
});

test("shows 'Renamed' without arrow when new_path is missing", () => {
  render(
    <ToolStatusBadge
      part={makePart({
        type: "tool-file_manager",
        input: { command: "rename", path: "/old.jsx" },
      })}
    />
  );
  expect(screen.getByText("Renamed /old.jsx")).toBeDefined();
});

test("shows 'Deleted' for file_manager delete", () => {
  render(
    <ToolStatusBadge
      part={makePart({
        type: "tool-file_manager",
        input: { command: "delete", path: "/old.jsx" },
      })}
    />
  );
  expect(screen.getByText("Deleted /old.jsx")).toBeDefined();
});

// --- file_manager pending states ---

test("shows 'Renaming' for pending rename", () => {
  render(
    <ToolStatusBadge
      part={makePart({
        type: "tool-file_manager",
        state: "input-available",
        input: { command: "rename", path: "/old.jsx", new_path: "/new.jsx" },
      })}
    />
  );
  expect(screen.getByText("Renaming /old.jsx \u2192 /new.jsx")).toBeDefined();
});

test("shows 'Deleting' for pending delete", () => {
  render(
    <ToolStatusBadge
      part={makePart({
        type: "tool-file_manager",
        state: "input-available",
        input: { command: "delete", path: "/old.jsx" },
      })}
    />
  );
  expect(screen.getByText("Deleting /old.jsx")).toBeDefined();
});

// --- Status indicators ---

test("renders green dot when complete", () => {
  const { container } = render(<ToolStatusBadge part={makePart()} />);
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("renders spinner when pending", () => {
  const { container } = render(
    <ToolStatusBadge part={makePart({ state: "input-available" })} />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

// --- Edge cases ---

test("shows 'Running' when input is undefined", () => {
  render(
    <ToolStatusBadge
      part={makePart({ state: "input-streaming", input: undefined })}
    />
  );
  expect(screen.getByText("Running str_replace_editor")).toBeDefined();
});

test("shows 'Ran' when input has no command", () => {
  render(<ToolStatusBadge part={makePart({ input: {} })} />);
  expect(screen.getByText("Ran str_replace_editor")).toBeDefined();
});

test("shows verb with 'file' when path is missing", () => {
  render(
    <ToolStatusBadge part={makePart({ input: { command: "create" } })} />
  );
  expect(screen.getByText("Created file")).toBeDefined();
});

test("shows 'Ran' for unknown tool", () => {
  render(
    <ToolStatusBadge
      part={makePart({
        type: "tool-unknown_tool",
        input: { command: "something" },
      })}
    />
  );
  expect(screen.getByText("Ran unknown_tool")).toBeDefined();
});

test("shows 'Running' for unknown tool in pending state", () => {
  render(
    <ToolStatusBadge
      part={makePart({
        type: "tool-unknown_tool",
        state: "input-available",
        input: { command: "something" },
      })}
    />
  );
  expect(screen.getByText("Running unknown_tool")).toBeDefined();
});

test("shows 'Ran' for unknown command on known tool", () => {
  render(
    <ToolStatusBadge
      part={makePart({ input: { command: "unknown_cmd", path: "/foo.jsx" } })}
    />
  );
  expect(screen.getByText("Ran str_replace_editor")).toBeDefined();
});

test("any state other than 'output-available' is treated as pending", () => {
  for (const state of ["call", "partial", "result", "input-streaming"]) {
    cleanup();
    render(
      <ToolStatusBadge
        part={makePart({
          state,
          input: { command: "create", path: "/App.jsx" },
        })}
      />
    );
    expect(screen.getByText("Creating /App.jsx")).toBeDefined();
  }
});

test("renders without crashing with empty input and pending state", () => {
  render(
    <ToolStatusBadge part={makePart({ state: "input-streaming", input: {} })} />
  );
  expect(screen.getByText("Running str_replace_editor")).toBeDefined();
});
