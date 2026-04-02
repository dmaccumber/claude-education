import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

// --- Mocks ---

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

// --- Setup ---

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

// --- Tests ---

describe("useAuth", () => {
  test("returns signIn, signUp, and isLoading", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.signIn).toBeTypeOf("function");
    expect(result.current.signUp).toBeTypeOf("function");
    expect(result.current.isLoading).toBe(false);
  });

  describe("signIn", () => {
    test("calls signIn action with email and password", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "bad creds" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(mockSignIn).toHaveBeenCalledWith("user@test.com", "password123");
    });

    test("returns the result from signIn action", async () => {
      const expected = { success: false, error: "Invalid credentials" };
      mockSignIn.mockResolvedValue(expected);

      const { result } = renderHook(() => useAuth());

      let authResult: unknown;
      await act(async () => {
        authResult = await result.current.signIn("user@test.com", "wrong");
      });

      expect(authResult).toEqual(expected);
    });

    test("does not navigate on failed sign in", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "fail" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "wrong");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("on success with anon work: creates project, clears anon data, and redirects", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "hello" }],
        fileSystemData: { "index.html": "<h1>hi</h1>" },
      });
      mockCreateProject.mockResolvedValue({ id: "proj-anon-123" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from "),
        messages: [{ role: "user", content: "hello" }],
        data: { "index.html": "<h1>hi</h1>" },
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-anon-123");
      // Should NOT call getProjects when anon work exists
      expect(mockGetProjects).not.toHaveBeenCalled();
    });

    test("on success with anon work having empty messages: skips anon branch", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [],
        fileSystemData: {},
      });
      mockGetProjects.mockResolvedValue([{ id: "existing-proj" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-proj");
    });

    test("on success with no anon work and existing projects: redirects to first project", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "proj-1" },
        { id: "proj-2" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-1");
    });

    test("on success with no anon work and no projects: creates new project and redirects", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "new-proj-456" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/new-proj-456");
    });

    test("sets isLoading to true during signIn and false after", async () => {
      let resolveSignIn: (value: unknown) => void;
      mockSignIn.mockReturnValue(
        new Promise((resolve) => {
          resolveSignIn = resolve;
        })
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      let signInPromise: Promise<unknown>;
      act(() => {
        signInPromise = result.current.signIn("user@test.com", "pw");
      });

      // isLoading should be true while awaiting
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn!({ success: false });
        await signInPromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false even if signIn action throws", async () => {
      mockSignIn.mockRejectedValue(new Error("network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current
          .signIn("user@test.com", "pw")
          .catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false even if handlePostSignIn throws", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockRejectedValue(new Error("server error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current
          .signIn("user@test.com", "pw")
          .catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("calls signUp action with email and password", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "exists" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@test.com", "password123");
      });

      expect(mockSignUp).toHaveBeenCalledWith("new@test.com", "password123");
    });

    test("returns the result from signUp action", async () => {
      const expected = { success: false, error: "Email taken" };
      mockSignUp.mockResolvedValue(expected);

      const { result } = renderHook(() => useAuth());

      let authResult: unknown;
      await act(async () => {
        authResult = await result.current.signUp("new@test.com", "pw");
      });

      expect(authResult).toEqual(expected);
    });

    test("does not navigate on failed sign up", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "fail" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@test.com", "pw");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("on success with anon work: creates project, clears anon data, and redirects", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "assistant", content: "design" }],
        fileSystemData: { "app.tsx": "code" },
      });
      mockCreateProject.mockResolvedValue({ id: "proj-signup-anon" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@test.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from "),
        messages: [{ role: "assistant", content: "design" }],
        data: { "app.tsx": "code" },
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-signup-anon");
      expect(mockGetProjects).not.toHaveBeenCalled();
    });

    test("on success with no anon work and existing projects: redirects to first project", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "proj-existing" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@test.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/proj-existing");
    });

    test("on success with no anon work and no projects: creates new project and redirects", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "new-proj-signup" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@test.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/new-proj-signup");
    });

    test("sets isLoading to true during signUp and false after", async () => {
      let resolveSignUp: (value: unknown) => void;
      mockSignUp.mockReturnValue(
        new Promise((resolve) => {
          resolveSignUp = resolve;
        })
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      let signUpPromise: Promise<unknown>;
      act(() => {
        signUpPromise = result.current.signUp("new@test.com", "pw");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp!({ success: false });
        await signUpPromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false even if signUp action throws", async () => {
      mockSignUp.mockRejectedValue(new Error("network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current
          .signUp("new@test.com", "pw")
          .catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
