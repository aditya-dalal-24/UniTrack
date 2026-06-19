import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * fileToGenerativePart
 * Converts a File to the inlineData format required by Gemini Vision.
 */
async function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result is a data URL like: data:image/png;base64,iVBORw0KGgo...
      const base64Data = reader.result.split(",")[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * scanTimetableWithGemini
 * Uses Gemini 1.5 Flash to intelligently extract timetable slots from an image.
 * 
 * @param {File} file - The timetable image or PDF (must be image for browser-based Gemini unless PDF is converted or if Gemini supports application/pdf directly. Note: Gemini 1.5 Pro/Flash supports application/pdf in inlineData!)
 * @returns {Promise<Object>} The parsed timetable in TimetablePreviewResponse format
 */
export async function scanTimetableWithGemini(file) {
  // 1. Initialize Gemini
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your frontend/.env file to use intelligent scanning."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Use gemini-1.5-flash for fast, multimodal vision tasks
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // 2. Prepare the prompt
  // We enforce a strict JSON schema to match what the backend TimetablePreviewResponse expects.
  const prompt = `
You are an expert at extracting university timetables from images and PDFs. 
Please carefully analyze the provided timetable and extract the schedule.

CRITICAL INSTRUCTIONS:
1. Extract ALL lecture, lab, and tutorial slots you can find in the grid.
2. Only extract actual scheduled academic slots. IGNORE irrelevant headers (like "Department of Data Science", "Effective from") and footers (like "Time Table coordinator", "Contact No", or email addresses).
3. For each slot, extract:
   - dayOfWeek: Must be uppercase (e.g., "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY").
   - startTime: In HH:MM format (24-hour clock, e.g., "09:00", "14:30").
   - endTime: In HH:MM format (24-hour clock, e.g., "09:50", "15:20").
   - subjectName: Intelligently extract and combine all relevant information into this single string. Include the lecture subject name, subject code, subject abbreviation, and faculty abbreviation/name. (e.g., "DSE2201 RDBMS (Prof. John Doe / JD)").
   - groupInfo: Any section, batch, or group info (e.g., "D1", "A", "Batch 1"). Leave empty if none.
   - roomNo: The room or building number if specified in the cell or globally at the top (e.g., "130", "Lab 103", "Block B Rm 2").
4. If a single class spans multiple time slots (like a 2-hour lab), return a single JSON object with the combined startTime and endTime.
5. If the text is slightly blurry, use your best judgment to decipher the text.
6. Return the result STRICTLY as a valid JSON object matching this exact schema, with NO markdown formatting, NO backticks, and NO extra text:

{
  "slots": [
    {
      "dayOfWeek": "MONDAY",
      "startTime": "09:00",
      "endTime": "09:50",
      "subjectName": "DSE2201 Relational Database Management Systems (Dr. Smith / SMT)",
      "groupInfo": "A",
      "roomNo": "130"
    }
  ],
  "detectedDays": ["MONDAY"],
  "detectedTimes": ["09:00", "09:50"]
}
  `;

  try {
    console.log("[GeminiScanner] Preparing file for Gemini...");
    const imagePart = await fileToGenerativePart(file);

    console.log("[GeminiScanner] Sending request to Gemini 1.5 Flash...");
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

    console.log("[GeminiScanner] Raw Gemini Response:", responseText);

    // 3. Clean and parse the response
    // Gemini sometimes wraps JSON in ```json ... ``` markdown blocks despite instructions.
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsedData = JSON.parse(cleanJson);

    if (!parsedData.slots || !Array.isArray(parsedData.slots)) {
      throw new Error("Invalid format returned by AI. 'slots' array is missing.");
    }

    // Sanitize data: Gemini sometimes returns numbers instead of strings
    parsedData.slots = parsedData.slots.map(s => ({
      dayOfWeek: s.dayOfWeek ? String(s.dayOfWeek).toUpperCase() : "",
      startTime: s.startTime ? String(s.startTime) : "",
      endTime: s.endTime ? String(s.endTime) : "",
      subjectName: s.subjectName ? String(s.subjectName) : "",
      groupInfo: s.groupInfo ? String(s.groupInfo) : "",
      roomNo: s.roomNo ? String(s.roomNo) : "",
      roomNumber: s.roomNo ? String(s.roomNo) : "" // Aliased for compatibility with UI
    }));

    // Sort the slots nicely before returning
    const DAYS_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
    parsedData.slots.sort((a, b) => {
      const dayDiff = DAYS_ORDER.indexOf(a.dayOfWeek) - DAYS_ORDER.indexOf(b.dayOfWeek);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });

    // Auto-calculate availableGroups from the parsed data
    const allGroups = new Set();
    for (const s of parsedData.slots) {
      if (s.groupInfo && s.groupInfo.trim() !== "") {
        allGroups.add(s.groupInfo.trim());
      }
    }
    parsedData.availableGroups = [...allGroups].sort();

    console.log(`[GeminiScanner] Extracted ${parsedData.slots.length} slots successfully.`);
    return parsedData;
  } catch (error) {
    console.error("[GeminiScanner] Error extracting timetable:", error);
    if (error.message.includes("JSON")) {
      throw new Error("The AI failed to format the timetable correctly. Please try again or ensure the image is clear.");
    }
    throw error; // Re-throw the original error to be caught by the UI
  }
}
