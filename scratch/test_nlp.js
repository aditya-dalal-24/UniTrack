function parseTaskString(input, subjects = []) {
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

  // 3. Extract Date
  const today = new Date();
  
  // Helper to optionally match prepositions before dates
  const prep = `(?:\\b(?:by|on|due|for|in)\\s+)?`;

  const datePatterns = [
    {
      regex: new RegExp(`${prep}(tomorrow|tmrw)\\b`, "i"),
      getDate: () => {
        const d = new Date(today);
        d.setDate(d.getDate() + 1);
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
        title = title.replace(match[0], "");
        break; 
      }
    }
  }

  // Final cleanup of dangling words at the end
  title = title.replace(/\b(by|on|due|for|in|at)\s*$/i, "");
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

console.log(parseTaskString("finish os assignment by tomorrow"));
