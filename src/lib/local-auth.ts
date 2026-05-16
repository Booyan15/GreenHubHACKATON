import type { Session, User } from "@supabase/supabase-js";

const USERS_KEY = "satelles.localAuth.users";
const SESSION_KEY = "satelles.localAuth.session";
const LOCAL_AUTH_EVENT = "satelles:local-auth";

type LocalUserRecord = {
  id: string;
  email: string;
  password: string;
  name?: string;
  organization?: string;
  createdAt: string;
};

type LocalSessionRecord = {
  userId: string;
  email: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function makeLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;

  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function getUsers() {
  return readJson<Record<string, LocalUserRecord>>(USERS_KEY, {});
}

function saveUsers(users: Record<string, LocalUserRecord>) {
  writeJson(USERS_KEY, users);
}

function makeUser(record: LocalUserRecord): User {
  return {
    id: record.id,
    aud: "authenticated",
    role: "authenticated",
    email: record.email,
    app_metadata: {},
    user_metadata: {
      full_name: record.name ?? "",
      organization: record.organization ?? "",
    },
    created_at: record.createdAt,
    updated_at: record.createdAt,
  } as User;
}

function makeSession(record: LocalUserRecord): Session {
  return {
    access_token: `local-${record.id}`,
    refresh_token: `local-refresh-${record.id}`,
    token_type: "bearer",
    expires_in: 60 * 60 * 24 * 365,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    user: makeUser(record),
  } as Session;
}

function saveSession(record: LocalUserRecord) {
  writeJson<LocalSessionRecord>(SESSION_KEY, {
    userId: record.id,
    email: record.email,
  });
  notifyLocalAuthChanged();
}

function notifyLocalAuthChanged() {
  if (!canUseStorage()) return;
  window.dispatchEvent(new Event(LOCAL_AUTH_EVENT));
}

export function getLocalAuthSession(): Session | null {
  const session = readJson<LocalSessionRecord | null>(SESSION_KEY, null);
  if (!session) return null;

  const users = getUsers();
  const record = users[session.email];
  return record && record.id === session.userId ? makeSession(record) : null;
}

export function signUpLocalUser({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}) {
  const normalizedEmail = normalizeEmail(email);
  const users = getUsers();

  if (users[normalizedEmail]) {
    throw new Error("An account already exists for this email.");
  }

  const record: LocalUserRecord = {
    id: makeLocalId(),
    email: normalizedEmail,
    password,
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };

  users[normalizedEmail] = record;
  saveUsers(users);
  saveSession(record);

  return makeSession(record);
}

export function signInLocalUser({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const normalizedEmail = normalizeEmail(email);
  const record = getUsers()[normalizedEmail];

  if (!record || record.password !== password) {
    throw new Error("Invalid login credentials.");
  }

  saveSession(record);
  return makeSession(record);
}

export function signInLocalDemoUser(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const users = getUsers();
  const record =
    users[normalizedEmail] ??
    ({
      id: `demo-${normalizedEmail}`,
      email: normalizedEmail,
      password: "Demo1234!",
      name: "SATELLES demo",
      createdAt: new Date().toISOString(),
    } satisfies LocalUserRecord);

  users[normalizedEmail] = record;
  saveUsers(users);
  saveSession(record);

  return makeSession(record);
}

export function getLocalUserProfile() {
  const session = readJson<LocalSessionRecord | null>(SESSION_KEY, null);
  if (!session) return { full_name: "", organization: "" };

  const record = getUsers()[session.email];
  return {
    full_name: record?.name ?? "",
    organization: record?.organization ?? "",
  };
}

export function updateLocalUserProfile({
  fullName,
  organization,
}: {
  fullName: string;
  organization: string;
}) {
  const session = readJson<LocalSessionRecord | null>(SESSION_KEY, null);
  if (!session) throw new Error("No local session found.");

  const users = getUsers();
  const record = users[session.email];
  if (!record || record.id !== session.userId) throw new Error("No local user found.");

  users[session.email] = {
    ...record,
    name: fullName.trim(),
    organization: organization.trim(),
  };
  saveUsers(users);
  notifyLocalAuthChanged();

  return makeSession(users[session.email]);
}

export function signOutLocalUser() {
  if (!canUseStorage()) return;
  localStorage.removeItem(SESSION_KEY);
  notifyLocalAuthChanged();
}

export function subscribeToLocalAuth(listener: () => void) {
  if (!canUseStorage()) return () => {};

  window.addEventListener(LOCAL_AUTH_EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(LOCAL_AUTH_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
