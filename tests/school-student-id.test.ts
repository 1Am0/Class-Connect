import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_STUDENT_EMAIL_DOMAIN,
  resolveStudentEmailDomain,
  schoolEmailFromStudentId,
  schoolStudentIdError,
} from "../lib/school-student-id";
import { validateImport } from "../lib/roster-import";

test("six-digit school IDs retain leading zeros and generate the school email", () => {
  assert.equal(
    schoolEmailFromStudentId("003421"),
    "003421@students.example.edu",
  );
  assert.equal(schoolStudentIdError("123456"), null);
  assert.match(schoolStudentIdError("34543") ?? "", /six-digit/i);
  assert.match(schoolStudentIdError("34543a") ?? "", /six-digit/i);
});

test("student email domain comes from the environment with a neutral default", () => {
  assert.equal(DEFAULT_STUDENT_EMAIL_DOMAIN, "students.example.edu");
  assert.equal(resolveStudentEmailDomain(undefined), "students.example.edu");
  assert.equal(resolveStudentEmailDomain("  "), "students.example.edu");
  assert.equal(
    resolveStudentEmailDomain(" @Students.Example.ORG "),
    "students.example.org",
  );
  for (const bad of ["localhost", "a@b.edu", "school .edu", "-x.edu", "x..edu"])
    assert.throws(() => resolveStudentEmailDomain(bad), /must be a domain/);
});

test("roster import requires IDs and rejects conflicting supplied emails", () => {
  assert.match(
    validateImport(
      [{ first_name: "Ada", last_name: "Lovelace", school_student_id: null }],
      [],
    ) ?? "",
    /six-digit/i,
  );
  assert.equal(
    validateImport(
      [
        {
          first_name: "Ada",
          last_name: "Lovelace",
          school_student_id: "003421",
        },
      ],
      [],
    ),
    null,
  );
  assert.match(
    validateImport(
      [
        {
          first_name: "Ada",
          last_name: "Lovelace",
          school_student_id: "003421",
          school_email: "someone@students.example.edu",
        },
      ],
      [],
    ) ?? "",
    /does not match/i,
  );
});
