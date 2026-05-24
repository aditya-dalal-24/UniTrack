export function parseTaskString(input, subjects = []) {
  let title = input;
  let dueDate = null;
  let type = "OTHER";
  let subject = "";

  const lowerInput = input.toLowerCase();

  // 1. Extract Type
  if (lowerInput.includes("assignment") || lowerInput.includes("hw") || lowerInput.includes("homework")) type = "ASSIGNMENT";
  else if (lowerInput.includes("exam") || lowerInput.includes("test") || lowerInput.includes("quiz")) type = "EXAM";
  else if (lowerInput.includes("project")) type = "PROJECT";
  else if (lowerInput.includes("study") || lowerInput.includes("read")) type = "STUDY";

  // 2. Extract Date
  const today = new Date();
  
  if (lowerInput.includes("today")) {
    dueDate = today.toISOString().split("T")[0];
    title = title.replace(/by today|today/i, "").trim();
  } else if (lowerInput.includes("tomorrow")) {
    const tmr = new Date(today);
    tmr.setDate(tmr.getDate() + 1);
    dueDate = tmr.toISOString().split("T")[0];
    title = title.replace(/by tomorrow|tomorrow/i, "").trim();
  } else {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < days.length; i++) {
      if (lowerInput.includes(`on ${days[i]}`) || lowerInput.includes(`by ${days[i]}`)) {
        const currentDay = today.getDay();
        let diff = i - currentDay;
        if (diff <= 0) diff += 7;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + diff);
        dueDate = targetDate.toISOString().split("T")[0];
        title = title.replace(new RegExp(`(by|on)\\s+${days[i]}`, 'i'), "").trim();
        break;
      }
    }
  }

  // 3. Extract Subject
  if (subjects && subjects.length > 0) {
    for (const sub of subjects) {
      if (lowerInput.includes(sub.name.toLowerCase()) || 
          (sub.courseCode && lowerInput.includes(sub.courseCode.toLowerCase()))) {
        subject = sub.name;
        // Optionally remove the subject from title to keep it clean, or keep it.
        // Let's keep it in title for tasks, but we map the subject field.
        break;
      }
    }
  }

  // Clean up title
  title = title.replace(/\s+/g, " ").trim();
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  } else {
    title = "New Task";
  }

  return { title, dueDate, type, subject };
}
