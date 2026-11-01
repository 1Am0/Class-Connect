import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emailError,
  passwordError,
  usernameError,
} from "../lib/account-validation";
import {
  createRecoveryTicket,
  validRecoveryTicket,
} from "../lib/server/recovery-ticket";

test("password rules apply to registration and password updates", () => {
  assert.equal(passwordError("SchoolDay7"), null);
  assert.match(passwordError("short1A")!, /8–20 characters/);
  assert.match(passwordError("schoolday7")!, /uppercase/);
  assert.match(passwordError("Schoolday")!, /number/);
  assert.match(passwordError("A1".repeat(11))!, /8–20 characters/);
  assert.equal(passwordError(null), "Enter a password.");
});

test("registration fields reject blank names and malformed email", () => {
  assert.equal(usernameError("  Ms. Rivera  "), null);
  assert.match(usernameError("  ")!, /username/);
  assert.equal(emailError("teacher@school.edu"), null);
  assert.match(emailError("not-an-email")!, /email/);
});

test("recovery ticket is bound to a teacher and expires", () => {
  const prior = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-secret";
  try {
    const ticket = createRecoveryTicket("teacher-one", 1000);
    assert.equal(validRecoveryTicket(ticket, "teacher-one", 2000), true);
    assert.equal(validRecoveryTicket(ticket, "teacher-two", 2000), false);
    assert.equal(validRecoveryTicket(ticket, "teacher-one", 601000), false);
    const last = ticket.at(-1);
    assert.equal(
      validRecoveryTicket(
        ticket.slice(0, -1) + (last === "0" ? "1" : "0"),
        "teacher-one",
        2000,
      ),
      false,
    );
  } finally {
    if (prior === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prior;
  }
});
