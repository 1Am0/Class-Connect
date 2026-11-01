export type HelpCategoryId =
  | "getting-started"
  | "attendance"
  | "students"
  | "schedules"
  | "activities"
  | "troubleshooting"
  | "settings";

export interface HelpArticle {
  id: string;
  title: string;
  category: HelpCategoryId;
  description: string;
  keywords: string[];
  steps: string[];
  route?: string;
  routeLabel?: string;
  tip?: string;
  related?: string[];
  image?: { src: string; alt: string; caption?: string };
}

export const helpCategories: { id: HelpCategoryId; label: string }[] = [
  { id: "getting-started", label: "Getting started" },
  { id: "attendance", label: "Attendance" },
  { id: "students", label: "Students" },
  { id: "schedules", label: "Schedules" },
  { id: "activities", label: "Classroom activities" },
  { id: "troubleshooting", label: "Troubleshooting" },
  { id: "settings", label: "General settings" },
];

// Keep labels and routes aligned with the classroom UI when those controls change.
export const helpArticles: HelpArticle[] = [
  {
    id: "start-dashboard",
    title: "Where do I start?",
    category: "getting-started",
    description: "Find your classes and the main classroom tools.",
    keywords: ["new teacher", "home", "first time", "dashboard"],
    steps: [
      "Open Home to see the class in session and Your classes for today.",
      "Choose a class in the list to open its attendance page.",
      "Use the sidebar for Activities, History, Manage classes, and Setup.",
    ],
    route: "/dashboard",
    routeLabel: "Go to Home",
    related: ["manage-classes", "add-student"],
  },
  {
    id: "start-class",
    title: "How do I set up my first class?",
    category: "getting-started",
    description: "Create a class and find it on Home.",
    keywords: ["new teacher", "first class", "create class"],
    steps: [
      "Choose Add class on Home.",
      "Enter the class name and period, then save it.",
      "Choose it under Your classes on Home to open the roster and attendance page.",
    ],
    route: "/dashboard",
    routeLabel: "Go to Home",
    related: ["weekly-schedule", "add-student"],
  },
  {
    id: "start-roster",
    title: "How do I prepare a class roster?",
    category: "getting-started",
    description: "Add students one at a time or import a list.",
    keywords: ["new teacher", "setup roster", "enroll students"],
    steps: [
      "Open a class and choose Add student to enter one student.",
      "For a list, open Manage classes, edit the class, and choose Import roster.",
      "Review the import preview before confirming changes.",
    ],
    route: "/classes",
    routeLabel: "Go to Manage classes",
    related: ["add-student", "import-roster"],
  },
  {
    id: "start-attendance",
    title: "How do I mark attendance for the first time?",
    category: "getting-started",
    description: "Use the Status control in a class roster.",
    keywords: ["new teacher", "first attendance", "check in"],
    steps: [
      "Open a class from Home.",
      "Find a student in the attendance table and tap Present, Absent, Late, or Excused in their Status row.",
      "A Pending sync marker means the change is visible locally while it waits for server confirmation.",
    ],
    route: "/dashboard",
    routeLabel: "Choose a class",
    related: ["take-attendance", "attendance-sync"],
  },
  {
    id: "start-activities",
    title: "What can I do in Class activities?",
    category: "getting-started",
    description: "Pick students, make groups, and use saved practice sets.",
    keywords: ["new teacher", "activity overview", "games"],
    steps: [
      "Open Activities from the sidebar and choose a class.",
      "Use Pick a student or Make groups with students marked present.",
      "Use Conversation prompts, Sentence scramble, or Vocabulary matching with an Activity set.",
    ],
    route: "/random",
    routeLabel: "Go to Activities",
    related: ["wheel", "groups", "activity-sets"],
  },
  {
    id: "start-settings",
    title: "Where do I change my settings?",
    category: "getting-started",
    description: "Find account, schedule, appearance, and sound options.",
    keywords: ["new teacher", "preferences", "configuration"],
    steps: [
      "Expand Setup in the sidebar and choose Settings.",
      "Choose the tab for Appearance, Attendance, Account & school day, or Student data.",
      "Make the change in the corresponding section and use its save control when shown.",
    ],
    route: "/settings",
    routeLabel: "Go to Settings",
    related: ["appearance", "account", "weekly-schedule"],
  },
  {
    id: "take-attendance",
    title: "How do I take attendance?",
    category: "attendance",
    description: "Mark students present, late, absent, or excused in a class.",
    keywords: [
      "check in",
      "sign in",
      "mark student",
      "roll call",
      "manual attendance",
    ],
    steps: [
      "Open a class from Home or the Classes menu.",
      "Find a student in the attendance table, or use Find a student to search.",
      "Choose the student's current status from the Status control. Changes save automatically.",
    ],
    route: "/dashboard",
    routeLabel: "Choose a class",
    related: ["bulk-attendance", "view-history"],
  },
  {
    id: "bulk-attendance",
    title: "How do I mark several students at once?",
    category: "attendance",
    description: "Apply one attendance status to a selection of students.",
    keywords: ["multiple", "batch", "bulk", "group attendance"],
    steps: [
      "Open the class and choose Select multiple students above the attendance table.",
      "Select the students you want to update.",
      "Choose a status for the selected students and apply the change.",
    ],
    route: "/dashboard",
    routeLabel: "Choose a class",
    related: ["take-attendance"],
  },
  {
    id: "view-history",
    title: "How do I view past attendance?",
    category: "attendance",
    description: "Review saved attendance for a class and date.",
    keywords: ["history", "previous day", "past records", "calendar"],
    steps: [
      "Open History from the sidebar.",
      "Choose the class at the top of the page.",
      "Select a date in the calendar to see its attendance summary and student records.",
    ],
    route: "/history",
    routeLabel: "Go to History",
    related: ["correct-attendance"],
  },
  {
    id: "correct-attendance",
    title: "How do I correct a past attendance record?",
    category: "attendance",
    description:
      "Update a saved attendance day when a record needs correction.",
    keywords: ["fix", "edit history", "change old attendance", "mistake"],
    steps: [
      "Open History, choose a class, and select the date to correct.",
      "Choose Correct this day above the attendance table.",
      "Change the student's status, then choose Done correcting when finished.",
    ],
    route: "/history",
    routeLabel: "Go to History",
    related: ["view-history"],
  },
  {
    id: "add-student",
    title: "How do I add a student?",
    category: "students",
    description: "Add one student to a class roster.",
    keywords: ["new student", "enroll", "create student", "roster"],
    steps: [
      "Open the student's class from Home or the Classes menu.",
      "Choose Add student above the attendance table.",
      "Enter the student's information in the pop-up and save it.",
    ],
    route: "/dashboard",
    routeLabel: "Choose a class",
    related: ["import-roster", "edit-student"],
  },
  {
    id: "edit-student",
    title: "How do I edit a student's information?",
    category: "students",
    description: "Update a student already in a class.",
    keywords: ["change name", "student number", "school id", "card", "tag"],
    steps: [
      "Open the student's class and find their row in the attendance table.",
      "Choose Edit in that row.",
      "Update the information in the pop-up and save it.",
    ],
    route: "/dashboard",
    routeLabel: "Choose a class",
    related: ["add-student"],
  },
  {
    id: "import-roster",
    title: "How do I add or import students from a list?",
    category: "students",
    description: "Paste a roster or upload a CSV file to add students in bulk.",
    keywords: [
      "spreadsheet",
      "csv",
      "paste names",
      "upload roster",
      "sync roster",
      "student ids",
    ],
    steps: [
      "Open Manage classes from the Classes menu.",
      "Edit the class, then choose Import roster. For a new class, use Save and import roster.",
      "Choose Paste names or Upload CSV, review the preview, then confirm the changes.",
    ],
    route: "/classes",
    routeLabel: "Go to Manage classes",
    tip: "Include each student's six-digit Student Number when available. Review changes before confirming a synchronized roster.",
    related: ["add-student", "manage-classes"],
  },
  {
    id: "manage-classes",
    title: "How do I add or edit a class?",
    category: "schedules",
    description: "Create a class or change its name and period.",
    keywords: ["new class", "period", "course", "classroom"],
    steps: [
      "Choose Add class on Home to create a class.",
      "To change an existing class, open Manage classes from the Classes menu and choose its edit control.",
      "Enter the class details and choose Save class.",
    ],
    route: "/classes",
    routeLabel: "Go to Manage classes",
    related: ["weekly-schedule", "archive-class"],
  },
  {
    id: "weekly-schedule",
    title: "How do I change my weekly class schedule?",
    category: "schedules",
    description: "Set the bell schedule used on each weekday.",
    keywords: ["times", "weekday", "monday", "bell schedule", "period time"],
    steps: [
      "Open Setup, then Settings.",
      "Choose Account & school day and expand Edit weekly schedule.",
      "Edit or create a schedule, assign it to weekdays, then choose Save weekly schedule.",
    ],
    route: "/settings",
    routeLabel: "Go to Settings",
    tip: "A weekday with no assigned schedule pauses automatic scanner routing.",
    related: ["manage-classes", "scanner"],
  },
  {
    id: "archive-class",
    title: "How do I archive or restore a class?",
    category: "schedules",
    description:
      "Move an unused class out of active navigation without losing its history.",
    keywords: ["remove class", "bring back class", "inactive", "restore"],
    steps: [
      "Open Manage classes from the Classes menu.",
      "Use the archive action on an active class and confirm Archive class.",
      "To bring a class back, find it in the archived classes section and choose its restore action.",
    ],
    route: "/classes",
    routeLabel: "Go to Manage classes",
    related: ["manage-classes", "view-history"],
  },
  {
    id: "wheel",
    title: "How do I randomly pick a student?",
    category: "activities",
    description: "Use the wheel to pick from students marked present.",
    keywords: [
      "random students",
      "spinner",
      "spin",
      "name picker",
      "select someone",
    ],
    steps: [
      "Mark students present in their class.",
      "Open Activities, choose the class, and select Pick a student.",
      "Choose Pick a student or the dice button in the center of the wheel.",
      "Close the selected-student pop-up. Choose Reset to include everyone again.",
    ],
    route: "/random",
    routeLabel: "Go to Pick a student",
    related: ["groups"],
  },
  {
    id: "groups",
    title: "How do I make random student groups?",
    category: "activities",
    description:
      "Divide present students by number of groups or students per group.",
    keywords: [
      "random students",
      "group picker",
      "groups of four",
      "teams",
      "shuffle",
    ],
    steps: [
      "Mark students present, then open Activities and choose the class.",
      "Select Make groups and choose Number of groups or Students per group under Group by.",
      "Enter the quantity and choose Make groups. Use Shuffle again for a new arrangement.",
    ],
    route: "/groups",
    routeLabel: "Go to Make groups",
    related: ["wheel"],
  },
  {
    id: "activity-sets",
    title: "How do I create and save an activity set?",
    category: "activities",
    description:
      "Save prompts, sentences, or vocabulary for classroom activities.",
    keywords: [
      "save activities",
      "new set",
      "library",
      "vocabulary",
      "prompts",
    ],
    steps: [
      "Open Activities and choose Conversation prompts, Sentence scramble, or Vocabulary matching.",
      "In Activity sets, choose New set.",
      "Enter a Set Name and the requested items, then save the set.",
    ],
    route: "/conversation",
    routeLabel: "Go to Conversation prompts",
    tip: "The activity you selected determines the set's content type.",
    related: ["import-activity-items", "conversation", "scramble", "matching"],
  },
  {
    id: "import-activity-items",
    title: "How do I import words, prompts, or sentences?",
    category: "activities",
    description: "Fill an activity set from pasted text or a file.",
    keywords: ["csv", "paste", "upload", "vocabulary list", "bulk sentences"],
    steps: [
      "Open the activity you want and choose New set or edit an existing set.",
      "In the set editor, choose Import words, Import prompts, or Import sentences.",
      "Preview the items and apply the import, then save the set.",
    ],
    route: "/conversation",
    routeLabel: "Go to Conversation prompts",
    related: ["activity-sets"],
  },
  {
    id: "conversation",
    title: "How do I use conversation prompts?",
    category: "activities",
    description: "Show a saved question for classroom discussion.",
    keywords: ["speaking", "questions", "discussion", "Spanish prompt"],
    steps: [
      "Open Activities and choose Conversation prompts.",
      "Choose the class, then select a set in Activity sets or create a new one.",
      "Use the activity controls to show another prompt.",
    ],
    route: "/conversation",
    routeLabel: "Go to Conversation prompts",
    related: ["activity-sets"],
  },
  {
    id: "scramble",
    title: "How do I use Sentence scramble?",
    category: "activities",
    description: "Practice putting words into the correct sentence order.",
    keywords: ["reorder words", "word order", "sentence game"],
    steps: [
      "Open Activities and choose Sentence scramble.",
      "Choose a saved set in Activity sets or create one with correct Spanish sentences.",
      "Select the words in order and use the activity controls to check the answer.",
    ],
    route: "/scramble",
    routeLabel: "Go to Sentence scramble",
    related: ["activity-sets"],
  },
  {
    id: "matching",
    title: "How do I use Vocabulary matching?",
    category: "activities",
    description: "Match saved words with their meanings.",
    keywords: ["wire", "connect", "translation", "word meaning", "pair"],
    steps: [
      "Open Activities and choose Vocabulary matching.",
      "Choose or create a vocabulary set in Activity sets.",
      "Select a word, then select its matching meaning. Each connection appears as a colored line.",
    ],
    route: "/matching",
    routeLabel: "Go to Vocabulary matching",
    related: ["activity-sets"],
  },
  {
    id: "scanner",
    title: "How do I connect the classroom scanner?",
    category: "settings",
    description: "Connect the Bluetooth scanner used for card check-ins.",
    keywords: ["bluetooth", "rfid", "card", "scan", "tap"],
    steps: [
      "Select the round Bluetooth button at the bottom right of Home or any class page.",
      "Select the classroom Bluetooth scanner when your browser asks for a device.",
      "Keep the classroom tab open while students tap their cards. After the first time, Chrome and Edge reconnect to the scanner by themselves.",
    ],
    route: "/scanner",
    routeLabel: "Go to Scanner",
    related: ["take-attendance", "weekly-schedule"],
  },
  {
    id: "appearance",
    title: "How do I change the classroom appearance?",
    category: "settings",
    description:
      "Choose light or dark, turn sound effects on or off, and change each class’s banner.",
    keywords: ["light", "dark", "color", "customize", "banner", "theme", "sound"],
    steps: [
      "Open Setup, then Settings.",
      "In Appearance, choose Light, Dark, or System. Sound effects are switched on or off there too.",
      "To change a class’s banner, open the class, choose the ⋯ button on its banner, then Customize: pick a theme, a color, or upload your own photo.",
    ],
    route: "/settings",
    routeLabel: "Go to Settings",
  },
  {
    id: "language",
    title: "How do I change the language?",
    category: "settings",
    description: "Use Class Connect in English or Spanish.",
    keywords: ["spanish", "español", "idioma", "translate", "language"],
    steps: [
      "Open Setup, then Settings.",
      "In Appearance, choose a language under Language.",
      "The page switches right away. Your choice is saved in this browser.",
    ],
    route: "/settings",
    routeLabel: "Go to Settings",
    tip: "Students see the check-in page in their own phone’s language, and can switch it at the top of the page.",
  },
  {
    id: "account",
    title: "How do I update my account?",
    category: "settings",
    description: "Change your displayed name or password.",
    keywords: ["username", "teacher name", "password reset", "email"],
    steps: [
      "Open Setup, then Settings.",
      "Choose Account & school day and find the Account section.",
      "Update your displayed name, change your password, or request a password reset email there.",
    ],
    route: "/settings",
    routeLabel: "Go to Settings",
  },
  {
    id: "missing-from-wheel",
    title: "Why isn't a student on the wheel?",
    category: "troubleshooting",
    description:
      "The wheel uses students marked present in the selected class.",
    keywords: [
      "missing wheel",
      "spinner absent",
      "not showing",
      "picked already",
    ],
    steps: [
      "Check that the correct class is selected in Activities.",
      "Open that class and mark the student Present, then return to Pick a student.",
      "If the student was already picked, choose Reset to include all eligible present students again.",
    ],
    route: "/random",
    routeLabel: "Go to Pick a student",
    related: ["wheel", "take-attendance"],
  },
  {
    id: "csv-trouble",
    title: "Why won't my student list import?",
    category: "troubleshooting",
    description: "Check the file type, column mapping, and preview errors.",
    keywords: ["csv error", "roster import failure", "bad file", "spreadsheet"],
    steps: [
      "In Manage classes, edit the class and open Import roster.",
      "Choose Upload CSV for a CSV file, or Paste names for copied text.",
      "Review the detected columns and any invalid or duplicate rows in the preview. Correct the source or mapping, then preview again before confirming.",
    ],
    route: "/classes",
    routeLabel: "Go to Manage classes",
    related: ["import-roster"],
  },
  {
    id: "roster-search",
    title: "Why can't I find a student?",
    category: "troubleshooting",
    description: "Check the class and search the attendance roster.",
    keywords: ["missing roster", "student not found", "wrong class"],
    steps: [
      "Choose the student's class from Home or the Classes menu.",
      "Use Find a student above the attendance table to search their name.",
      "If they are not in that class, add them with Add student or review the class's imported roster.",
    ],
    route: "/dashboard",
    routeLabel: "Choose a class",
    related: ["add-student", "import-roster"],
  },
  {
    id: "attendance-sync",
    title: "Why does attendance say Pending sync?",
    category: "troubleshooting",
    description: "A local change is waiting to be confirmed by the server.",
    keywords: ["didn't save", "offline", "slow", "sync", "network"],
    steps: [
      "Check that the browser is connected to the internet.",
      "Keep the classroom page open while the pending change syncs.",
      "If the row shows a sync conflict, review the student's status before using Discard queued change and reload.",
    ],
    route: "/dashboard",
    routeLabel: "Choose a class",
    tip: "Pending sync means the change is visible locally but has not yet been confirmed by the server.",
    related: ["take-attendance", "correct-attendance"],
  },
  {
    id: "forgotten-card",
    title: "What if a student forgets their card?",
    category: "troubleshooting",
    description: "You can record attendance from the class roster.",
    keywords: ["lost card", "no card", "forgot tag", "rfid"],
    steps: [
      "Open the student's class.",
      "Find the student in the attendance table and tap Present in their Status row.",
      "Use Edit in the student's row later if their card information needs updating.",
    ],
    route: "/dashboard",
    routeLabel: "Choose a class",
    related: ["take-attendance", "edit-student"],
  },
  {
    id: "missing-activity-set",
    title: "Why isn't my activity set appearing?",
    category: "troubleshooting",
    description: "Each activity shows its own type of saved sets.",
    keywords: ["set missing", "saved activity not there", "wrong activity"],
    steps: [
      "Open the activity where you created the set: Conversation prompts, Sentence scramble, or Vocabulary matching.",
      "Look for its name under Activity sets. Sets for other activities do not appear here.",
      "If it is still missing, confirm that the set was saved in the editor.",
    ],
    route: "/conversation",
    routeLabel: "Go to Conversation prompts",
    related: ["activity-sets"],
  },
];

export const popularHelpIds = [
  "take-attendance",
  "import-roster",
  "wheel",
  "groups",
  "weekly-schedule",
  "activity-sets",
];

export function helpForPage(
  route: string,
  articles: HelpArticle[] = helpArticles,
): HelpArticle[] {
  const ids: Record<string, string[]> = {
    dashboard: [
      "manage-classes",
      "scanner",
      "take-attendance",
      "start-dashboard",
    ],
    classes: [
      "manage-classes",
      "import-roster",
      "archive-class",
      "weekly-schedule",
    ],
    attendance: [
      "take-attendance",
      "add-student",
      "bulk-attendance",
      "attendance-sync",
    ],
    history: ["view-history", "correct-attendance"],
    random: ["wheel", "missing-from-wheel", "groups", "start-activities"],
    groups: ["groups", "wheel"],
    conversation: ["conversation", "activity-sets", "import-activity-items"],
    scramble: ["scramble", "activity-sets", "import-activity-items"],
    matching: ["matching", "activity-sets", "import-activity-items"],
    scanner: ["scanner", "weekly-schedule"],
    settings: [
      "appearance",
      "language",
      "weekly-schedule",
      "account",
      "start-settings",
    ],
  };
  return (ids[route] ?? []).flatMap((id) => {
    const article = articles.find((item) => item.id === id);
    return article ? [article] : [];
  });
}

const ignoredWords = new Set([
  "a",
  "an",
  "and",
  "can",
  "do",
  "for",
  "how",
  "i",
  "in",
  "is",
  "my",
  "of",
  "the",
  "to",
  "with",
  // Spanish
  "como",
  "cual",
  "de",
  "del",
  "el",
  "en",
  "la",
  "las",
  "los",
  "mi",
  "mis",
  "para",
  "por",
  "que",
  "se",
  "un",
  "una",
  "y",
  "yo",
]);

function normalize(value: string): string {
  // Accents are ignored, so "como" finds "¿Cómo…?".
  return value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function terms(value: string): string[] {
  return normalize(value)
    .split(/\s+/)
    .filter((word) => word && !ignoredWords.has(word));
}

export function searchHelp(
  query: string,
  articles: HelpArticle[] = helpArticles,
): HelpArticle[] {
  const words = terms(query);
  if (!words.length) return [];
  return articles
    .map((article) => {
      const title = normalize(article.title);
      const description = normalize(article.description);
      const keywords = normalize(article.keywords.join(" "));
      const body = normalize(
        [article.steps.join(" "), article.tip ?? ""].join(" "),
      );
      const matches = words.map((word) =>
        title.includes(word)
          ? 10
          : keywords.includes(word)
            ? 6
            : description.includes(word)
              ? 3
              : body.includes(word)
                ? 1
                : 0,
      );
      const coverage = matches.filter(Boolean).length;
      return {
        article,
        score:
          matches.reduce<number>((sum, value) => sum + value, 0) +
          (normalize(article.id) === normalize(query) ? 20 : 0),
        coverage,
      };
    })
    .filter((item) => item.coverage > 0)
    .sort((a, b) => b.coverage - a.coverage || b.score - a.score)
    .map((item) => item.article);
}
