import { test, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

// Mock resizable panels (require ResizeObserver which isn't available in jsdom)
vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: any) => <div>{children}</div>,
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => null,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">Preview</div>,
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">FileTree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">CodeEditor</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">HeaderActions</div>,
}));

vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: any) => <>{children}</>,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

test("renders with Preview tab active by default", () => {
  render(<MainContent />);

  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
  expect(screen.queryByTestId("file-tree")).toBeNull();
});

test("clicking Code tab switches to code view", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  await user.click(screen.getByRole("tab", { name: "Code" }));

  expect(screen.queryByTestId("preview-frame")).toBeNull();
  expect(screen.getByTestId("code-editor")).toBeDefined();
  expect(screen.getByTestId("file-tree")).toBeDefined();
});

test("clicking Preview tab switches back to preview view", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  // Switch to Code
  await user.click(screen.getByRole("tab", { name: "Code" }));
  expect(screen.queryByTestId("preview-frame")).toBeNull();

  // Switch back to Preview
  await user.click(screen.getByRole("tab", { name: "Preview" }));
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("can toggle between views multiple times", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  // Preview → Code → Preview → Code
  await user.click(screen.getByRole("tab", { name: "Code" }));
  expect(screen.getByTestId("code-editor")).toBeDefined();

  await user.click(screen.getByRole("tab", { name: "Preview" }));
  expect(screen.getByTestId("preview-frame")).toBeDefined();

  await user.click(screen.getByRole("tab", { name: "Code" }));
  expect(screen.getByTestId("code-editor")).toBeDefined();
});

test("Preview tab is marked active initially", () => {
  render(<MainContent />);

  const previewTab = screen.getByRole("tab", { name: "Preview" });
  const codeTab = screen.getByRole("tab", { name: "Code" });

  expect(previewTab.getAttribute("data-state")).toBe("active");
  expect(codeTab.getAttribute("data-state")).toBe("inactive");
});

test("Code tab becomes active after clicking it", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  await user.click(screen.getByRole("tab", { name: "Code" }));

  const previewTab = screen.getByRole("tab", { name: "Preview" });
  const codeTab = screen.getByRole("tab", { name: "Code" });

  expect(codeTab.getAttribute("data-state")).toBe("active");
  expect(previewTab.getAttribute("data-state")).toBe("inactive");
});
