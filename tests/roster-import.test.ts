import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mapRosterRows,
  parseDelimited,
  parseRosterText,
  planRoster,
  validateImport,
} from "../lib/roster-import";
import type { Student } from "../types";

const student = (
  id: string,
  first: string,
  last: string,
  number: string | null = null,
): Student => ({
  id,
  teacher_id: "teacher",
  first_name: first,
  last_name: last,
  display_name: `${first} ${last}`,
  optional_notes: "",
  active: true,
  school_student_id: number,
});

test("paste parser handles names, commas, tabs, quoted CSV and leading-zero IDs", () => {
  assert.deepEqual(
    parseRosterText(
      'Ada Lovelace\nHopper, Grace\n"Curie, Marie",00042',
      "paste",
    ),
    [
      { first_name: "Ada", last_name: "Lovelace", school_student_id: null },
      { first_name: "Grace", last_name: "Hopper", school_student_id: null },
      { first_name: "Marie", last_name: "Curie", school_student_id: "00042" },
    ],
  );
  assert.deepEqual(
    parseRosterText(
      "First Name\tLast Name\tStudent Number\nLin\tChen\t0012",
      "paste",
    ),
    [{ first_name: "Lin", last_name: "Chen", school_student_id: "0012" }],
  );
  assert.deepEqual(
    parseRosterText("Grace,Hopper", "paste", "first_last", "first_last"),
    [{ first_name: "Grace", last_name: "Hopper", school_student_id: null }],
  );
});

test("roster paste cross-checks supplied school emails against required IDs", () => {
  const rows = parseRosterText(
    "First Name,Last Name,Student Number,School Email\nAda,Lovelace,003421,003421@students.example.edu\nGrace,Hopper,003422,003422@students.example.edu",
    "paste",
  );
  assert.equal(rows[0].school_email, "003421@students.example.edu");
  assert.equal(validateImport(rows, []), null);
  assert.match(
    validateImport(
      [rows[0], { ...rows[1], school_email: "003421@students.example.edu" }],
      [],
    ) ?? "",
    /school email does not match/i,
  );
});

test("planning matches IDs, leaves name-only matches for review, and identifies removals", () => {
  const students = [
    student("a", "Ada", "Lovelace", "001"),
    student("b", "Grace", "Hopper"),
  ];
  const plan = planRoster(
    [
      { first_name: "Ada", last_name: "Lovelace", school_student_id: "001" },
      { first_name: "Grace", last_name: "Hopper", school_student_id: null },
      { first_name: "New", last_name: "Student", school_student_id: "003" },
    ],
    students,
    ["a", "b"],
  );
  assert.equal(plan.rows[0].existing_student_id, "a");
  assert.equal(plan.rows[1].issue, "possible_match");
  assert.equal(plan.rows[2].issue, null);
  assert.deepEqual(plan.removals, ["b"]);
});

test("validation rejects duplicate school numbers and reused student records", () => {
  const students = [student("a", "Ada", "Lovelace", "000001")];
  assert.match(
    validateImport(
      [
        {
          first_name: "Ada",
          last_name: "Lovelace",
          school_student_id: "000001",
          existing_student_id: "a",
        },
        {
          first_name: "Other",
          last_name: "Person",
          school_student_id: "000001",
          existing_student_id: null,
        },
      ],
      students,
    ) ?? "",
    /Student Number/i,
  );
  assert.match(
    validateImport(
      [
        {
          first_name: "Ada",
          last_name: "Lovelace",
          school_student_id: "000001",
          existing_student_id: "a",
        },
        {
          first_name: "Ada",
          last_name: "Lovelace",
          school_student_id: "000002",
          existing_student_id: "a",
        },
      ],
      [student("a", "Ada", "Lovelace")],
    ) ?? "",
    /same student/i,
  );
});

test("empty, malformed, and oversized imports are rejected before saving", () => {
  assert.match(validateImport([], []) ?? "", /at least one/i);
  assert.match(
    validateImport(
      Array.from({ length: 501 }, () => ({
        first_name: "A",
        last_name: "B",
        school_student_id: null,
      })),
      [],
    ) ?? "",
    /500/,
  );
  assert.match(
    validateImport(
      [{ first_name: "Single", last_name: "", school_student_id: null }],
      [],
    ) ?? "",
    /first and last/i,
  );
  assert.throws(() => parseRosterText('"Unclosed', "paste"), /not closed/i);
});

test("CSV column mapping accepts school-specific headings", () => {
  const rows = parseDelimited(
    "Pupil,School Number,Family,Given\nStudent A,00042,Chen,Lin",
  );
  assert.deepEqual(
    mapRosterRows(rows.slice(1), { full: null, first: 3, last: 2, id: 1 }),
    [{ first_name: "Lin", last_name: "Chen", school_student_id: "00042" }],
  );
});

test("duplicate names remain ambiguous and a full 500-student roster validates", () => {
  const sameName = [student("a", "Alex", "Lee"), student("b", "Alex", "Lee")];
  const preview = planRoster(
    [{ first_name: "Alex", last_name: "Lee", school_student_id: null }],
    sameName,
    [],
  );
  assert.equal(preview.rows[0].issue, "ambiguous");
  assert.equal(preview.rows[0].existing_student_id, null);
  const large = Array.from({ length: 500 }, (_, index) => ({
    first_name: `Student${index}`,
    last_name: "Sample",
    school_student_id: String(index).padStart(6, "0"),
  }));
  assert.equal(validateImport(large, []), null);
});
