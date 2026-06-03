export function parseTaskString(input, subjects = []) {
  let title = input;
  let dueDate = null;
  let type = "OTHER";
  let subject = "";

  const lowerInput = input.toLowerCase();

  // 1. Extract Type (Map to ASSIGNMENT or TODO to match backend TaskType enum)
  if (lowerInput.match(/\b(assignment|hw|homework|project|presentation|report|exam|test|quiz|midterm|final)\b/)) {
    type = "ASSIGNMENT";
  } else if (lowerInput.match(/\b(study|read|review|todo|task)\b/)) {
    type = "TODO";
  }

  // 2. Extract Subject
  if (subjects && subjects.length > 0) {
    const sortedSubjects = [...subjects].sort((a, b) => b.name.length - a.name.length);
    for (const sub of sortedSubjects) {
      const subName = sub.name.toLowerCase();
      const courseCode = sub.courseCode ? sub.courseCode.toLowerCase() : "";
      
      const nameRegex = new RegExp(`\\b${escapeRegExp(subName)}\\b`, "i");
      const codeRegex = courseCode ? new RegExp(`\\b${escapeRegExp(courseCode)}\\b`, "i") : null;

      if (nameRegex.test(lowerInput) || (codeRegex && codeRegex.test(lowerInput))) {
        subject = sub.name;
        break;
      }
    }
  }

  // 3. Extract Date
  const today = new Date();
  
  // Helper to optionally match prepositions before dates
  const prep = `(?:\\b(?:by|on|due|for|in)\\s+)?`;

  const datePatterns = [
    {
      regex: new RegExp(`${prep}(today|tonight)\\b`, "i"),
      getDate: () => new Date(today)
    },
    {
      regex: new RegExp(`${prep}(tomorrow|tmrw)\\b`, "i"),
      getDate: () => {
        const d = new Date(today);
        d.setDate(d.getDate() + 1);
        return d;
      }
    },
    {
      regex: new RegExp(`${prep}(next\\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\\b`, "i"),
      getDate: (match) => {
        const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const targetDay = days.indexOf(match[2].toLowerCase());
        const isNext = !!match[1];
        const currentDay = today.getDay();
        let diff = targetDay - currentDay;
        if (diff <= 0) diff += 7;
        if (isNext) diff += 7;
        const d = new Date(today);
        d.setDate(today.getDate() + diff);
        return d;
      }
    },
    {
      regex: new RegExp(`${prep}(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "i"),
      getDate: (match) => {
        const monthStr = match[1];
        const dayStr = match[2];
        const monthIndex = new Date(`${monthStr} 1, 2000`).getMonth();
        const d = new Date(today.getFullYear(), monthIndex, parseInt(dayStr, 10));
        if (d < today && d.getMonth() < today.getMonth()) {
          d.setFullYear(d.getFullYear() + 1);
        }
        return d;
      }
    },
    {
      regex: new RegExp(`${prep}(\\d{1,2})(?:st|nd|rd|th)?\\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\b`, "i"),
      getDate: (match) => {
        const dayStr = match[1];
        const monthStr = match[2];
        const monthIndex = new Date(`${monthStr} 1, 2000`).getMonth();
        const d = new Date(today.getFullYear(), monthIndex, parseInt(dayStr, 10));
        if (d < today && d.getMonth() < today.getMonth()) {
          d.setFullYear(d.getFullYear() + 1);
        }
        return d;
      }
    },
    {
      regex: new RegExp(`${prep}(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?\\b`, "i"),
      getDate: (match) => {
        const month = parseInt(match[1], 10) - 1;
        const day = parseInt(match[2], 10);
        let year = match[3] ? parseInt(match[3], 10) : today.getFullYear();
        if (year < 100) year += 2000;
        const d = new Date(year, month, day);
        if (!match[3] && d < today && d.getMonth() < today.getMonth()) {
          d.setFullYear(d.getFullYear() + 1);
        }
        return d;
      }
    },
    {
      regex: new RegExp(`\\bin\\s+(\\d+)\\s+days?\\b`, "i"),
      getDate: (match) => {
        const days = parseInt(match[1], 10);
        const d = new Date(today);
        d.setDate(today.getDate() + days);
        return d;
      }
    }
  ];

  for (const pattern of datePatterns) {
    const match = title.match(pattern.regex);
    if (match) {
      const d = pattern.getDate(match);
      if (!isNaN(d.getTime())) {
        dueDate = d.toISOString().split("T")[0];
        // Use the regex itself for replacement to guarantee removal of the exact matched pattern
        title = title.replace(pattern.regex, "");
        break; 
      }
    }
  }

  // Final cleanup of dangling words at the end
  title = title.replace(/\b(by|on|due|for|in|at)\s*$/i, "");
  // Also clean up any lingering prepositions that might be left isolated or double spaces
  title = title.replace(/\s+/g, " ").trim();
  
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  } else {
    if (subject) {
      title = `${subject} ${type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}`;
    } else {
      title = "New Task";
    }
  }

  return { title, dueDate, type, subject };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
