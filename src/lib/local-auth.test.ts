/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  getLocalAuthSession,
  getLocalUserProfile,
  signInLocalDemoUser,
  signInLocalUser,
  signOutLocalUser,
  signUpLocalUser,
  updateLocalUserProfile,
} from "./local-auth";

describe("local auth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates a local account and restores its session", () => {
    const session = signUpLocalUser({
      email: " User@Example.com ",
      password: "secret123",
      name: "Test User",
    });

    expect(session.user.email).toBe("user@example.com");
    expect(getLocalAuthSession()?.user.email).toBe("user@example.com");
    expect(getLocalAuthSession()?.user.user_metadata.full_name).toBe("Test User");

    signOutLocalUser();
    expect(getLocalAuthSession()).toBeNull();

    signInLocalUser({ email: "user@example.com", password: "secret123" });
    expect(getLocalAuthSession()?.user.email).toBe("user@example.com");
  });

  it("updates a local user's profile settings", () => {
    signUpLocalUser({
      email: "owner@example.com",
      password: "secret123",
      name: "Old Name",
    });

    updateLocalUserProfile({
      fullName: "New Farmer",
      organization: "North Field Cooperative",
    });

    expect(getLocalUserProfile()).toEqual({
      full_name: "New Farmer",
      organization: "North Field Cooperative",
    });
    expect(getLocalAuthSession()?.user.user_metadata.full_name).toBe("New Farmer");
    expect(getLocalAuthSession()?.user.user_metadata.organization).toBe("North Field Cooperative");
  });

  it("creates demo sessions without a backend", () => {
    signInLocalDemoUser("gov@demo.satelles.mk");

    const session = getLocalAuthSession();

    expect(session?.user.email).toBe("gov@demo.satelles.mk");
    expect(session?.user.id).toBe("demo-gov@demo.satelles.mk");
  });
});
