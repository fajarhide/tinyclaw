import { expect, test } from "bun:test";
import {
  USER_CONTEXT_TEMPLATE,
  buildUserContextStatus,
  normalizeUserContextContent,
} from "./user-context";

test("normalizeUserContextContent returns undefined when empty", () => {
  expect(normalizeUserContextContent(undefined)).toBeUndefined();
  expect(normalizeUserContextContent(null)).toBeUndefined();
  expect(normalizeUserContextContent("   \n")).toBeUndefined();
});

test("normalizeUserContextContent returns trimmed content", () => {
  expect(normalizeUserContextContent("  # About Me\n\nHello\n  ")).toBe("# About Me\n\nHello");
});

test("buildUserContextStatus omits content by default", () => {
  expect(buildUserContextStatus("# About Me", false)).toEqual({
    active: true,
  });
});

test("buildUserContextStatus includes content when requested", () => {
  expect(buildUserContextStatus("# About Me", true)).toEqual({
    active: true,
    content: "# About Me",
  });
});

test("USER_CONTEXT_TEMPLATE includes the expected sections", () => {
  expect(USER_CONTEXT_TEMPLATE).toContain("# About Me");
  expect(USER_CONTEXT_TEMPLATE).toContain("Name / nickname:");
  expect(USER_CONTEXT_TEMPLATE).toContain("How you like replies");
});
