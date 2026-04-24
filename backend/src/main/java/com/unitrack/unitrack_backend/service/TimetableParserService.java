package com.unitrack.unitrack_backend.service;

import com.unitrack.unitrack_backend.dto.response.TimetablePreviewResponse;
import com.unitrack.unitrack_backend.dto.response.TimetablePreviewResponse.PreviewSlot;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import technology.tabula.ObjectExtractor;
import technology.tabula.Table;
import technology.tabula.RectangularTextContainer;
import technology.tabula.extractors.BasicExtractionAlgorithm;
import technology.tabula.extractors.SpreadsheetExtractionAlgorithm;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;

import java.io.InputStream;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Slf4j
public class TimetableParserService {

    // Canonical day names
    private static final List<String> DAYS = List.of(
            "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY");

    // Abbreviations we accept
    private static final Map<String, String> DAY_ALIASES = new LinkedHashMap<>();
    static {
        DAY_ALIASES.put("MONDAY", "MONDAY");
        DAY_ALIASES.put("TUESDAY", "TUESDAY");
        DAY_ALIASES.put("WEDNESDAY", "WEDNESDAY");
        DAY_ALIASES.put("THURSDAY", "THURSDAY");
        DAY_ALIASES.put("FRIDAY", "FRIDAY");
        DAY_ALIASES.put("SATURDAY", "SATURDAY");
        DAY_ALIASES.put("SUNDAY", "SUNDAY");
        DAY_ALIASES.put("MON", "MONDAY");
        DAY_ALIASES.put("TUE", "TUESDAY");
        DAY_ALIASES.put("TUES", "TUESDAY");
        DAY_ALIASES.put("WED", "WEDNESDAY");
        DAY_ALIASES.put("THU", "THURSDAY");
        DAY_ALIASES.put("THUR", "THURSDAY");
        DAY_ALIASES.put("THURS", "THURSDAY");
        DAY_ALIASES.put("FRI", "FRIDAY");
        DAY_ALIASES.put("SAT", "SATURDAY");
        DAY_ALIASES.put("SUN", "SUNDAY");
    }

    // Time patterns
    private static final Pattern TIME_RANGE = Pattern.compile(
            "(\\d{1,2}[.:]\\s*\\d{2}[\\s\\u00A0]*(?:AM|PM)?)[\\s\\u00A0]*(?:[-–—]+|[A-Z]+)[\\s\\u00A0]*(\\d{1,2}[.:]\\s*\\d{2}[\\s\\u00A0]*(?:AM|PM)?)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern SINGLE_TIME = Pattern.compile(
            "\\d{1,2}[.:]\\s*\\d{2}(\\s*(?:AM|PM))?", Pattern.CASE_INSENSITIVE);
    private static final Pattern HOUR_ONLY = Pattern.compile(
            "^\\s*(\\d{1,2})\\s*(?:AM|PM)\\s*$", Pattern.CASE_INSENSITIVE);

    // Field extraction from cell text
    private static final Pattern COURSE_CODE = Pattern.compile(
            "(?:^|\\s)([A-Z]{2,5}[\\s-]?[0-9]{2,4}[A-Z]?|[0-9]{2,4}[A-Z]{2,5}[0-9]{2,4}[A-Z]?)(?:\\s|$)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern ROOM_PATTERN = Pattern.compile(
            "(?:Room|Rm|R|Lab|LH|Hall|Venue|Class)[\\s.:_-]*([A-Z]?\\d{1,4}[A-Z]?)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern PROF_PATTERN = Pattern.compile(
            "(?:Prof\\.?|Dr\\.?|Lecturer|Faculty|Instructor)[:\\s]+([A-Za-z .]+)",
            Pattern.CASE_INSENSITIVE);

    // Common suffixes in university timetable cells: -L (Lecture), -T (Tutorial),
    // -P (Practical), -TH (Theory), -S (Section/Session)
    private static final Pattern LEGEND_SUFFIX = Pattern.compile(
            "-(L|T|P|TH|LAB|LEC|TUT|PR|S|SEM)$", Pattern.CASE_INSENSITIVE);

    // Legend patterns (common in university xlsx files)
    // e.g., "DAA - Design and Analysis of Algorithms", "DAA: Design and
    // Analysis..."
    // e.g., "RVS - Prof. R.V. Sharma"
    private static final Pattern LEGEND_ENTRY = Pattern.compile(
            "^\\s*\\(?([A-Z0-9][A-Z0-9\\-]{1,15})\\)?\\s*[-–=:]\\s*(.+)$", Pattern.CASE_INSENSITIVE);

    private static final Pattern BREAK_PATTERN = Pattern.compile(".*(BREAK|LUNCH|SLOT|RECESS|INTERVAL).*",
            Pattern.CASE_INSENSITIVE);

    // Curated color palette for auto-assignment
    private static final String[] SUBJECT_COLORS = {
            "#6366f1", "#f472b6", "#10b981", "#f59e0b", "#ef4444",
            "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6", "#f97316",
            "#a855f7", "#22d3ee", "#84cc16", "#e11d48", "#0ea5e9"
    };

    // ===================== PUBLIC ENTRY POINT =====================

    public TimetablePreviewResponse parseFile(MultipartFile file) throws Exception {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        List<List<String>> grid;
        Map<String, String> subjectLegend = new LinkedHashMap<>(); // abbreviation → full name
        Map<String, String> facultyLegend = new LinkedHashMap<>(); // abbreviation → faculty name

        try (InputStream is = file.getInputStream()) {
            if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
                Workbook workbook = filename.endsWith(".xlsx") ? new XSSFWorkbook(is) : new HSSFWorkbook(is);
                grid = parseExcel(workbook);
                // Parse legend from rows below the timetable grid
                parseLegendFromGrid(grid, subjectLegend, facultyLegend);
                workbook.close();
            } else if (filename.endsWith(".pdf")) {
                grid = parsePdf(is);
                parseLegendFromGrid(grid, subjectLegend, facultyLegend);
            } else {
                throw new RuntimeException("Unsupported file type. Please upload .xlsx, .xls, or .pdf");
            }
        }

        if (grid.isEmpty()) {
            throw new RuntimeException("No tabular data found in the file.");
        }

        log.info("Parsed legends — subjects: {}, faculty: {}", subjectLegend, facultyLegend);
        logGrid(grid);

        return extractTimetableFromGrid(grid, subjectLegend, facultyLegend);
    }

    // ===================== LEGEND PARSING =====================

    /**
     * Scans the grid for legend/key sections that map abbreviations to full names.
     * Typically found below the timetable grid in university Excel files.
     * Common patterns:
     * "DAA - Design and Analysis of Algorithms"
     * "RVS: Prof. R.V. Sharma"
     * "Subject Abbreviations:" (section header)
     * "Faculty Abbreviations:" (section header)
     */
    private void parseLegendFromGrid(List<List<String>> grid,
            Map<String, String> subjectLegend,
            Map<String, String> facultyLegend) {
        // We'll classify entries into subject or faculty legend
        // by looking at section headers or heuristics
        Map<String, String> currentTarget = null; // null = auto-detect

        for (int r = 0; r < grid.size(); r++) {
            for (int c = 0; c < grid.get(r).size(); c++) {
                String cell = grid.get(r).get(c).trim();
                if (cell.isEmpty())
                    continue;

                String upper = cell.toUpperCase();

                // Detect section headers
                if (upper.contains("SUBJECT") && (upper.contains("ABBREVIAT") || upper.contains("LEGEND")
                        || upper.contains("KEY") || upper.contains("CODE"))) {
                    currentTarget = subjectLegend;
                    continue;
                }
                if (upper.contains("FACULTY") && (upper.contains("ABBREVIAT") || upper.contains("LEGEND")
                        || upper.contains("KEY") || upper.contains("NAME"))) {
                    currentTarget = facultyLegend;
                    continue;
                }

                // Try to parse "ABBR - Full Name" patterns
                Matcher m = LEGEND_ENTRY.matcher(cell);
                if (m.matches()) {
                    String abbr = m.group(1).toUpperCase().trim();
                    String fullName = m.group(2).trim();

                    // Skip if the abbreviation looks like a day name
                    if (resolveDay(abbr) != null)
                        continue;

                    if (currentTarget != null) {
                        currentTarget.put(abbr, fullName);
                    } else {
                        // Auto-detect: if the value contains "Prof" or "Dr", it's faculty
                        if (fullName.matches("(?i).*(Prof|Dr|Lecturer|Faculty|Instructor).*")) {
                            facultyLegend.put(abbr, fullName);
                        } else {
                            subjectLegend.put(abbr, fullName);
                        }
                    }
                } else {
                    // Check for two-column legend format: col C has abbreviation, col C+1 has full
                    // name
                    if (c + 1 < grid.get(r).size()) {
                        String nextCell = grid.get(r).get(c + 1).trim();
                        if (!nextCell.isEmpty() && cell.length() <= 15 && cell.matches("[A-Z0-9][A-Z0-9\\-]{1,15}")
                                && nextCell.length() > cell.length() && resolveDay(cell) == null) {
                            if (currentTarget != null) {
                                currentTarget.put(cell.toUpperCase(), nextCell);
                            } else {
                                // Improved heuristic: if nextCell has 2+ words and is mixed case, likely
                                // faculty
                                boolean looksLikeFaculty = nextCell
                                        .matches("(?i).*(Prof|Dr|Lecturer|Faculty|Instructor).*")
                                        || (nextCell.split("\\s+").length >= 2
                                                && !nextCell.equals(nextCell.toUpperCase()));

                                if (looksLikeFaculty) {
                                    facultyLegend.put(cell.toUpperCase(), nextCell);
                                } else {
                                    subjectLegend.put(cell.toUpperCase(), nextCell);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // ===================== EXCEL PARSING =====================

    private List<List<String>> parseExcel(Workbook workbook) {
        Sheet sheet = workbook.getSheetAt(0);
        int maxRow = sheet.getLastRowNum();
        int maxCol = 0;

        for (int r = 0; r <= maxRow; r++) {
            Row row = sheet.getRow(r);
            if (row != null && row.getLastCellNum() > maxCol) {
                maxCol = row.getLastCellNum();
            }
        }

        List<List<String>> grid = new ArrayList<>();
        for (int r = 0; r <= maxRow; r++) {
            List<String> rowList = new ArrayList<>(Collections.nCopies(maxCol, ""));
            grid.add(rowList);
        }

        DataFormatter formatter = new DataFormatter();

        // Pass 1: Merged regions first
        for (int i = 0; i < sheet.getNumMergedRegions(); i++) {
            CellRangeAddress region = sheet.getMergedRegion(i);
            Row firstRow = sheet.getRow(region.getFirstRow());
            if (firstRow == null)
                continue;
            Cell firstCell = firstRow.getCell(region.getFirstColumn());
            if (firstCell == null)
                continue;

            String val = formatter.formatCellValue(firstCell).trim();
            if (val.isEmpty())
                continue;

            for (int r = region.getFirstRow(); r <= region.getLastRow(); r++) {
                for (int c = region.getFirstColumn(); c <= region.getLastColumn(); c++) {
                    if (r <= maxRow && c < maxCol) {
                        grid.get(r).set(c, val);
                    }
                }
            }
        }

        // Pass 2: Fill remaining cells
        for (int r = 0; r <= maxRow; r++) {
            Row row = sheet.getRow(r);
            if (row == null)
                continue;
            for (int c = 0; c < maxCol; c++) {
                if (grid.get(r).get(c).isEmpty()) {
                    Cell cell = row.getCell(c);
                    if (cell != null) {
                        grid.get(r).set(c, formatter.formatCellValue(cell).trim());
                    }
                }
            }
        }

        return grid;
    }

    // ===================== PDF PARSING =====================

    private List<List<String>> parsePdf(InputStream is) throws Exception {
        PDDocument document = PDDocument.load(is);
        ObjectExtractor oe = new ObjectExtractor(document);
        SpreadsheetExtractionAlgorithm lattice = new SpreadsheetExtractionAlgorithm();
        BasicExtractionAlgorithm stream = new BasicExtractionAlgorithm();

        List<List<String>> bestGrid = new ArrayList<>();

        for (int pageNum = 1; pageNum <= document.getNumberOfPages(); pageNum++) {
            try {
                technology.tabula.Page page = oe.extract(pageNum);
                List<Table> tables = lattice.extract(page);
                if (tables.isEmpty()) {
                    tables = stream.extract(page);
                }

                for (Table table : tables) {
                    List<List<String>> grid = tabulaTableToGrid(table);
                    if (countNonEmpty(grid) > countNonEmpty(bestGrid)) {
                        bestGrid = grid;
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to extract page {}: {}", pageNum, e.getMessage());
            }
        }

        oe.close();
        document.close();

        if (bestGrid.isEmpty()) {
            throw new RuntimeException(
                    "Could not find any structured tables in this PDF. Try the Excel format instead.");
        }

        return bestGrid;
    }

    @SuppressWarnings("rawtypes")
    private List<List<String>> tabulaTableToGrid(Table table) {
        List<List<String>> grid = new ArrayList<>();
        List<List<RectangularTextContainer>> rows = table.getRows();
        for (List<RectangularTextContainer> row : rows) {
            List<String> gridRow = new ArrayList<>();
            for (RectangularTextContainer cell : row) {
                gridRow.add(cell.getText().trim().replaceAll("[\\r\\n]+", " "));
            }
            grid.add(gridRow);
        }
        return grid;
    }

    private int countNonEmpty(List<List<String>> grid) {
        int count = 0;
        for (List<String> row : grid) {
            for (String cell : row) {
                if (cell != null && !cell.isBlank())
                    count++;
            }
        }
        return count;
    }

    // ===================== GRID → TIMETABLE EXTRACTION =====================

    private TimetablePreviewResponse extractTimetableFromGrid(
            List<List<String>> grid,
            Map<String, String> subjectLegend,
            Map<String, String> facultyLegend) {

        Map<Integer, String> colToDay = new LinkedHashMap<>();
        Map<Integer, String> rowToDay = new LinkedHashMap<>();
        Map<Integer, String> colToTime = new LinkedHashMap<>();
        Map<Integer, String> rowToTime = new LinkedHashMap<>();

        for (int r = 0; r < grid.size(); r++) {
            for (int c = 0; c < grid.get(r).size(); c++) {
                String raw = grid.get(r).get(c);
                String cleaned = raw.toUpperCase().replaceAll("[^A-Z0-9:.\\-–]", "");

                String dayFound = resolveDay(cleaned);
                if (dayFound != null) {
                    colToDay.putIfAbsent(c, dayFound);
                    rowToDay.putIfAbsent(r, dayFound);
                }

                if (looksLikeTime(raw)) {
                    rowToTime.putIfAbsent(r, raw.trim());
                    colToTime.putIfAbsent(c, raw.trim());
                }
            }
        }

        // Determine layout orientation
        boolean layoutB = !colToTime.isEmpty() && !rowToDay.isEmpty()
                && colToTime.size() > rowToTime.size();

        List<PreviewSlot> slots = new ArrayList<>();
        Map<String, String> colorMap = new LinkedHashMap<>(); // subject name → color

        if (layoutB) {
            for (Map.Entry<Integer, String> dayEntry : rowToDay.entrySet()) {
                int r = dayEntry.getKey();
                String day = dayEntry.getValue();
                for (Map.Entry<Integer, String> timeEntry : colToTime.entrySet()) {
                    int c = timeEntry.getKey();
                    if (c < grid.get(r).size()) {
                        String cellText = grid.get(r).get(c).trim();
                        if (isValidSubject(cellText)) {
                            slots.addAll(
                                    buildSlotsFromCell(day, colToTime.get(c), cellText, subjectLegend, facultyLegend,
                                            colorMap));
                        }
                    }
                }
            }
        } else {
            if (colToDay.isEmpty() || rowToTime.isEmpty()) {
                throw new RuntimeException(
                        "Could not identify Day headers or Time slots in the document. " +
                                "Please ensure the timetable has clear day names (Mon-Sun) and time values.");
            }
            for (Map.Entry<Integer, String> timeEntry : rowToTime.entrySet()) {
                int r = timeEntry.getKey();
                String timeStr = timeEntry.getValue();
                for (Map.Entry<Integer, String> dayEntry : colToDay.entrySet()) {
                    int c = dayEntry.getKey();
                    if (c < grid.get(r).size()) {
                        String cellText = grid.get(r).get(c).trim();
                        if (isValidSubject(cellText)) {
                            slots.addAll(
                                    buildSlotsFromCell(colToDay.get(c), timeStr, cellText, subjectLegend, facultyLegend,
                                            colorMap));
                        }
                    }
                }
            }
        }

        // Deduplicate
        slots = deduplicateSlots(slots);

        if (slots.isEmpty()) {
            throw new RuntimeException(
                    "Extracted empty timetable. Ensure the file contains recognizable subjects mapped to days and times.");
        }

        // Sort by day order then start time
        slots.sort(Comparator.comparingInt((PreviewSlot s) -> DAYS.indexOf(s.getDayOfWeek()))
                .thenComparing(PreviewSlot::getStartTime));

        // Merge consecutive Lab slots into single 2-hour sessions
        slots = mergeLabSlots(slots);

        Set<String> detectedDays = slots.stream()
                .map(PreviewSlot::getDayOfWeek).collect(Collectors.toCollection(LinkedHashSet::new));
        Set<String> detectedTimes = new LinkedHashSet<>(
                layoutB ? colToTime.values() : rowToTime.values());

        // Extract available groups
        Set<String> allGroups = new TreeSet<>();
        for (PreviewSlot s : slots) {
            if (s.getGroupInfo() != null) {
                // Split G5G6 into G5, G6
                Matcher m = Pattern.compile("[A-Z]\\d+").matcher(s.getGroupInfo());
                boolean found = false;
                while (m.find()) {
                    allGroups.add(m.group());
                    found = true;
                }
                if (!found) {
                    allGroups.add(s.getGroupInfo());
                }
            }
        }

        return TimetablePreviewResponse.builder()
                .slots(slots)
                .detectedDays(new ArrayList<>(detectedDays))
                .detectedTimes(new ArrayList<>(detectedTimes))
                .availableGroups(new ArrayList<>(allGroups))
                .build();
    }

    private List<PreviewSlot> mergeLabSlots(List<PreviewSlot> slots) {
        if (slots == null || slots.isEmpty())
            return slots;

        // 1. Enforce single-slot duration (55-60 min) for all subjects initially
        // "Do NOT assume 2-hour duration from start time alone"
        for (PreviewSlot s : slots) {
            if (!s.getIsBreak()) {
                int duration = timeToMinutes(s.getEndTime()) - timeToMinutes(s.getStartTime());
                if (duration > 65) {
                    s.setEndTime(addOneHour(s.getStartTime()));
                }
            }
        }

        // 2. Group ALL slots by Day, Alphanumeric Subject, Professor, and Group
        Map<String, List<PreviewSlot>> groupedSlots = new LinkedHashMap<>();

        for (PreviewSlot s : slots) {
            String subKey = s.getIsBreak() ? "break-" + System.identityHashCode(s) 
                    : s.getSubjectName().replaceAll("[^A-Za-z0-9]", "").toLowerCase();
            String profKey = s.getProfessor() != null ? s.getProfessor().toLowerCase().trim() : "";
            String groupKey = s.getGroupInfo() != null ? s.getGroupInfo().toLowerCase().trim() : "";
            String key = String.format("%s|%s|%s|%s", s.getDayOfWeek().toUpperCase(), subKey, profKey, groupKey);
            groupedSlots.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
        }

        List<PreviewSlot> result = new ArrayList<>();

        for (List<PreviewSlot> group : groupedSlots.values()) {
            group.sort(Comparator.comparingInt(s -> timeToMinutes(s.getStartTime())));

            int i = 0;
            while (i < group.size()) {
                PreviewSlot current = group.get(i);
                
                if (current.getIsBreak()) {
                    result.add(current);
                    i++;
                    continue;
                }

                if (isLab(current)) {
                    // LAB: Occupy 2 slots ONLY if same subject continues in next slot
                    if (i + 1 < group.size()) {
                        PreviewSlot next = group.get(i + 1);
                        if (canMergeLabs(current, next)) {
                            current.setEndTime(next.getEndTime());
                            i++; // Consume the next slot
                        }
                    }
                    result.add(current);
                    i++;
                } else {
                    // NORMAL SUBJECT: Always occupy EXACTLY 1 slot. Never extend.
                    result.add(current);
                    
                    // Look ahead to drop consecutive duplicates (fix first lecture doubling)
                    while (i + 1 < group.size()) {
                        PreviewSlot next = group.get(i + 1);
                        if (timeToMinutes(next.getStartTime()) == timeToMinutes(current.getStartTime())) {
                            i++; // Exact duplicate (same time), skip
                        } else if (canMergeLabs(current, next)) { 
                            i++; // Consecutive duplicate of normal subject -> DROP it
                        } else {
                            break;
                        }
                    }
                    i++;
                }
            }
        }

        // Final Sort & Clean: Remove any slot that is fully contained within another slot's time
        // Sort descending by duration so the largest slots (merged ones) come first
        result.sort(Comparator.comparingInt((PreviewSlot s) -> DAYS.indexOf(s.getDayOfWeek()))
                .thenComparingInt(s -> timeToMinutes(s.getStartTime()))
                .thenComparing((PreviewSlot s1, PreviewSlot s2) -> Integer.compare(
                        timeToMinutes(s2.getEndTime()) - timeToMinutes(s2.getStartTime()),
                        timeToMinutes(s1.getEndTime()) - timeToMinutes(s1.getStartTime()))));

        return cleanupOverlaps(result);
    }

    private List<PreviewSlot> cleanupOverlaps(List<PreviewSlot> slots) {
        if (slots.size() < 2)
            return slots;
        List<PreviewSlot> clean = new ArrayList<>();
        for (PreviewSlot s : slots) {
            boolean isContained = false;
            for (PreviewSlot existing : clean) {
                if (existing.getDayOfWeek().equals(s.getDayOfWeek()) &&
                        existing.getSubjectName().equals(s.getSubjectName()) &&
                        timeToMinutes(s.getStartTime()) >= timeToMinutes(existing.getStartTime()) &&
                        timeToMinutes(s.getEndTime()) <= timeToMinutes(existing.getEndTime())) {
                    isContained = true;
                    break;
                }
            }
            if (!isContained)
                clean.add(s);
        }
        return clean;
    }

    private boolean canMergeLabs(PreviewSlot s1, PreviewSlot s2) {
        if (!s1.getDayOfWeek().equalsIgnoreCase(s2.getDayOfWeek()))
            return false;

        // Lenient subject comparison (alphanumeric only, e.g. "OOP Lab" matches
        // "OOP-Lab")
        String sub1 = s1.getSubjectName().replaceAll("[^A-Za-z0-9]", "").toLowerCase();
        String sub2 = s2.getSubjectName().replaceAll("[^A-Za-z0-9]", "").toLowerCase();
        if (!sub1.equals(sub2))
            return false;

        // Lenient room/group comparison (match if both present and same, or if one is
        // missing)
        String r1 = trimOrNull(s1.getRoomNumber());
        String r2 = trimOrNull(s2.getRoomNumber());
        if (r1 != null && r2 != null && !r1.equalsIgnoreCase(r2))
            return false;

        String g1 = trimOrNull(s1.getGroupInfo());
        String g2 = trimOrNull(s2.getGroupInfo());
        if (g1 != null && g2 != null && !g1.equalsIgnoreCase(g2))
            return false;

        return isConsecutive(s1.getEndTime(), s2.getStartTime());
    }

    private boolean isConsecutive(String end1, String start2) {
        if (end1 == null || start2 == null || end1.isBlank() || start2.isBlank())
            return false;
        if (end1.equals(start2))
            return true;

        try {
            int t1 = timeToMinutes(end1);
            int t2 = timeToMinutes(start2);
            // Allow up to 10 minutes gap for intelligent merging
            return Math.abs(t2 - t1) <= 10;
        } catch (Exception e) {
            return false;
        }
    }

    private int timeToMinutes(String time) {
        String[] parts = time.split(":");
        int h = Integer.parseInt(parts[0]);
        int m = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
        return h * 60 + m;
    }

    private String trimOrNull(String s) {
        if (s == null)
            return null;
        String t = s.replaceAll("[\\s\\u00A0]+", " ").trim();
        return t.isEmpty() ? null : t;
    }

    private boolean isLab(PreviewSlot s) {
        if (s == null || s.getIsBreak())
            return false;
        String name = s.getSubjectName() != null ? s.getSubjectName().toUpperCase() : "";
        String fullName = s.getSubjectFullName() != null ? s.getSubjectFullName().toUpperCase() : "";
        String code = s.getCourseCode() != null ? s.getCourseCode().toUpperCase() : "";

        return name.contains("LAB") || fullName.contains("LAB") ||
                name.contains("PRACTICAL") || fullName.contains("PRACTICAL") ||
                name.endsWith("L") || code.endsWith("L");
    }

    // ===================== SLOT BUILDER (with legend resolution)
    // =====================

    // Group patterns: G5G6, G1G2G3, Batch A, Group-1, etc.
    private static final Pattern GROUP_PATTERN = Pattern.compile(
            "(?:^|\\s)((?:G\\d+){2,}|(?:G\\d+)|Batch\\s*[A-Z0-9]+|Group\\s*[-:]?\\s*[A-Z0-9]+|Section\\s*[-:]?\\s*[A-Z0-9]+)(?:\\s|$)",
            Pattern.CASE_INSENSITIVE);

    // Bare room number: just a 3-4 digit number, optionally preceded by a block
    // letter (e.g., F-403)
    private static final Pattern BARE_ROOM = Pattern.compile("^([A-Z]-?)?\\d{3,4}[A-Z]?$", Pattern.CASE_INSENSITIVE);

    private List<PreviewSlot> buildSlotsFromCell(String day, String timeStr, String cellText,
            Map<String, String> subjectLegend,
            Map<String, String> facultyLegend,
            Map<String, String> colorMap) {

        // Detect if the cell has multiple distinct group markers (e.g., "G5 Lab A G6
        // Lab B")
        Matcher gm = GROUP_PATTERN.matcher(cellText);
        List<Integer> splitIndices = new ArrayList<>();
        while (gm.find()) {
            splitIndices.add(gm.start());
        }

        if (splitIndices.size() <= 1) {
            // Single group info or shared slot
            return Collections.singletonList(buildSlot(day, timeStr, cellText, subjectLegend, facultyLegend, colorMap));
        }

        // Multiple groups found - split cell text into segments starting with each
        // group marker
        List<PreviewSlot> cellSlots = new ArrayList<>();
        for (int i = 0; i < splitIndices.size(); i++) {
            int start = splitIndices.get(i);
            int end = (i + 1 < splitIndices.size()) ? splitIndices.get(i + 1) : cellText.length();
            String segment = cellText.substring(start, end).trim();
            if (!segment.isEmpty()) {
                cellSlots.add(buildSlot(day, timeStr, segment, subjectLegend, facultyLegend, colorMap));
            }
        }
        return cellSlots;
    }

    private PreviewSlot buildSlot(String day, String timeStr, String cellText,
            Map<String, String> subjectLegend,
            Map<String, String> facultyLegend,
            Map<String, String> colorMap) {
        // ---- Parse time range ----
        String start = "";
        String end = "";
        Matcher tm = TIME_RANGE.matcher(timeStr);
        if (tm.find()) {
            start = normalizeTime(tm.group(1).trim());
            end = normalizeTime(tm.group(2).trim());
        } else if (timeStr.contains("-") || timeStr.contains("–")) {
            String[] parts = timeStr.split("[-–]");
            start = normalizeTime(parts[0].trim());
            if (parts.length > 1)
                end = normalizeTime(parts[1].trim());
        } else {
            start = normalizeTime(timeStr.trim());
        }

        if (end.isEmpty() && !start.isEmpty()) {
            end = addOneHour(start);
        }

        // ---- Tokenize cell text ----
        // Split on newlines, slashes, pipes, commas, and parentheses
        String[] lines = cellText.split("[\\r\\n/|(),]+");
        List<String> tokens = new ArrayList<>();
        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty())
                tokens.add(trimmed);
        }

        // ---- Classify each token ----
        String resolvedSubject = null;
        String courseCode = null;
        String resolvedFaculty = null;
        String roomNumber = null;
        String groupInfo = null;
        List<String> unresolved = new ArrayList<>();

        for (int i = 0; i < tokens.size(); i++) {
            String token = tokens.get(i);
            String upperToken = token.toUpperCase().trim();
            String cleanToken = token.replaceAll("[\\s]+", " ").trim();

            // 1. Check group pattern first (G5G6, Batch A, Group 1, etc.)
            if (groupInfo == null) {
                Matcher gm = GROUP_PATTERN.matcher(cleanToken);
                if (gm.find()) {
                    groupInfo = gm.group(1).trim();
                    // Remove the group from the token to see if there's more content
                    String remainder = cleanToken.replace(gm.group(0).trim(), "").trim();
                    if (!remainder.isEmpty()) {
                        tokens.add(remainder); // re-process remainder
                    }
                    continue;
                }
            }

            // 2. Check for room pattern (explicit: Room 301, Lab 5, LH-3, etc.)
            if (roomNumber == null) {
                Matcher rm = ROOM_PATTERN.matcher(cleanToken);
                if (rm.find()) {
                    roomNumber = rm.group(0).trim();
                    continue;
                }
            }

            // 3. Check for explicit professor pattern (Prof. X, Dr. Y)
            if (resolvedFaculty == null) {
                Matcher pm = PROF_PATTERN.matcher(cleanToken);
                if (pm.find()) {
                    resolvedFaculty = pm.group(0).trim();
                    continue;
                }
            }

            // 4. Check subject legend (exact match, then try stripping suffix)
            if (resolvedSubject == null) {
                String subjectMatch = legendLookup(upperToken, subjectLegend);
                if (subjectMatch != null) {
                    resolvedSubject = subjectMatch;
                    courseCode = upperToken.replaceAll(LEGEND_SUFFIX.pattern(), "");
                    continue;
                }
            }

            // 5. Check faculty legend (exact match, then try stripping suffix)
            if (resolvedFaculty == null) {
                String facultyMatch = legendLookup(upperToken, facultyLegend);
                if (facultyMatch != null) {
                    resolvedFaculty = facultyMatch;
                    continue;
                }
            }

            // 6. Try splitting compound tokens like "DAA RVS G5G6 301"
            // by whitespace and resolve each sub-token
            String[] subTokens = cleanToken.split("\\s+");
            if (subTokens.length > 1) {
                boolean anyResolved = false;
                for (String sub : subTokens) {
                    String upperSub = sub.toUpperCase().trim();
                    if (upperSub.isEmpty())
                        continue;

                    // Group
                    if (groupInfo == null) {
                        Matcher gm2 = GROUP_PATTERN.matcher(sub);
                        if (gm2.find()) {
                            groupInfo = gm2.group(1).trim();
                            anyResolved = true;
                            continue;
                        }
                    }
                    // Subject legend
                    if (resolvedSubject == null) {
                        String subMatch = legendLookup(upperSub, subjectLegend);
                        if (subMatch != null) {
                            resolvedSubject = subMatch;
                            courseCode = upperSub.replaceAll(LEGEND_SUFFIX.pattern(), "");
                            anyResolved = true;
                            continue;
                        }
                    }
                    // Faculty legend
                    if (resolvedFaculty == null) {
                        String facMatch = legendLookup(upperSub, facultyLegend);
                        if (facMatch != null) {
                            resolvedFaculty = facMatch;
                            anyResolved = true;
                            continue;
                        }
                    }
                    // Bare room number (3-4 digits)
                    if (roomNumber == null && BARE_ROOM.matcher(sub).matches()) {
                        roomNumber = sub;
                        anyResolved = true;
                        continue;
                    }
                    // Course code
                    if (courseCode == null) {
                        Matcher ccm = COURSE_CODE.matcher(sub);
                        if (ccm.find()) {
                            courseCode = ccm.group(1).trim().toUpperCase();
                            if (resolvedSubject == null && subjectLegend.containsKey(courseCode)) {
                                resolvedSubject = subjectLegend.get(courseCode);
                            }
                            anyResolved = true;
                            continue;
                        }
                    }
                    // Unresolved sub-token
                    if (!looksLikeTime(sub) && resolveDay(upperSub) == null) {
                        unresolved.add(sub);
                    }
                }
                if (anyResolved)
                    continue;
            }

            // 7. Bare room number (standalone 3-4 digit token)
            if (roomNumber == null && BARE_ROOM.matcher(cleanToken).matches()) {
                roomNumber = cleanToken;
                continue;
            }

            // 8. Course code pattern
            if (courseCode == null) {
                Matcher ccm = COURSE_CODE.matcher(cleanToken);
                if (ccm.find()) {
                    courseCode = ccm.group(1).trim().toUpperCase();
                    if (resolvedSubject == null && subjectLegend.containsKey(courseCode)) {
                        resolvedSubject = subjectLegend.get(courseCode);
                    }
                    continue;
                }
            }

            // 9. Remaining unresolved token — potential subject name
            if (!looksLikeTime(cleanToken) && resolveDay(upperToken) == null) {
                unresolved.add(cleanToken);
            }
        }

        // ---- Assign unresolved tokens ----
        for (String u : unresolved) {
            if (resolvedSubject == null) {
                resolvedSubject = u;
            } else if (resolvedFaculty == null) {
                resolvedFaculty = u;
            }
        }

        // ---- Heuristic Swap: if subject looks like faculty abbr and faculty looks
        // like subject name ----
        if (resolvedSubject != null && resolvedFaculty != null) {
            boolean subIsAbbr = resolvedSubject.matches("^[A-Z0-9\\-]{2,8}$");
            boolean facIsFullName = resolvedFaculty.split("\\s+").length >= 2;

            if (subIsAbbr && facIsFullName && !resolvedSubject.equals(resolvedSubject.toLowerCase())) {
                // Swap them: the abbreviation is likely the faculty and the full name is the
                // subject
                String temp = resolvedSubject;
                resolvedSubject = resolvedFaculty;
                resolvedFaculty = temp;
            }
        }

        // ---- Final Resolution for Faculty ----
        if (resolvedFaculty != null && resolvedFaculty.matches("^[A-Z0-9\\-]{2,8}$")) {
            String facMatch = legendLookup(resolvedFaculty.toUpperCase(), facultyLegend);
            if (facMatch == null)
                facMatch = legendLookup(resolvedFaculty.toUpperCase(), subjectLegend);
            if (facMatch != null)
                resolvedFaculty = facMatch;
        }

        // Detect if this is a break slot
        boolean isBreak = BREAK_PATTERN.matcher(cellText).matches();
        if (!isBreak) {
            // Check if any line looks like a break
            for (String line : lines) {
                if (BREAK_PATTERN.matcher(line).matches()) {
                    isBreak = true;
                    break;
                }
            }
        }

        // ---- Cleanup ----
        String originalFullName = resolvedSubject != null ? resolvedSubject
                : (courseCode != null ? courseCode : cellText.trim());
        String subject = originalFullName;

        // Lab Detection: If course code ends with 'L', it's a lab
        boolean isLab = (courseCode != null && courseCode.toUpperCase().endsWith("L")) ||
                (subject != null && subject.toUpperCase().contains("LAB"));

        if (!isBreak) {
            subject = shortenSubjectName(subject, isLab);
        } else {
            // Reconstruct the full break name instead of using only the first parsed word
            subject = cellText.replaceAll("[\\r\\n/|(),]+", " ").replaceAll("\\s+", " ").trim().toUpperCase();
        }

        // The user explicitly requested NOT to show the course code or faculty code
        // so we nullify the courseCode to prevent UI rendering
        courseCode = null;

        // Assign color based on subject name + professor to differentiate same-named subjects
        String profKey = resolvedFaculty != null ? resolvedFaculty.toLowerCase().trim() : "";
        String colorKey = (subject.toLowerCase().trim() + "|" + profKey).trim();
        String color = colorMap.computeIfAbsent(colorKey,
                k -> SUBJECT_COLORS[colorMap.size() % SUBJECT_COLORS.length]);

        return PreviewSlot.builder()
                .dayOfWeek(day)
                .startTime(start)
                .endTime(end)
                .subjectName(subject)
                .subjectFullName(isBreak ? null : originalFullName)
                .courseCode(courseCode)
                .professor(isBreak ? null : resolvedFaculty)
                .roomNumber(isBreak ? null : roomNumber)
                .groupInfo(isBreak ? null : groupInfo)
                .color(color)
                .isBreak(isBreak)
                .build();
    }

    // ===================== HELPERS =====================

    /**
     * Looks up a token in a legend map. First tries exact match,
     * then strips common university suffixes (-L, -T, -P, -TH, etc.) and retries.
     * Returns the resolved value or null if not found.
     */
    private String legendLookup(String token, Map<String, String> legend) {
        if (token == null || legend == null || legend.isEmpty())
            return null;
        // Exact match
        if (legend.containsKey(token))
            return legend.get(token);
        // Try stripping suffix (e.g., ARSO-L → ARSO, 24CS201T-P → 24CS201T)
        String stripped = LEGEND_SUFFIX.matcher(token).replaceAll("").trim();
        if (!stripped.equals(token) && legend.containsKey(stripped)) {
            return legend.get(stripped);
        }
        return null;
    }

    private static final Set<String> STOP_WORDS = Set.of("AND", "OF", "THE", "IN", "FOR", "TO", "A", "AN", "ON",
            "WITH");

    private String shortenSubjectName(String name, boolean isLab) {
        if (name == null || name.isBlank())
            return name;

        String trimmed = name.trim();

        // Normalize: Remove the word "LAB" (case-insensitive) if we're in a lab case
        // so it doesn't interfere with acronym generation
        String baseName = trimmed;
        if (isLab) {
            baseName = trimmed.replaceAll("(?i)\\bLAB\\b", "").replaceAll("\\s+", " ").trim();
            // If baseName becomes empty (e.g. the input was just "LAB"), fallback to
            // original trimmed
            if (baseName.isEmpty())
                baseName = trimmed;
        }

        String result;
        // Check if it's already a short acronym (all caps/digits, <= 8 chars)
        if (baseName.matches("^[A-Z0-9][A-Z0-9\\-]{0,7}$")) {
            result = baseName;
        } else {
            String[] words = baseName.split("\\s+");
            if (words.length == 1) {
                result = baseName;
            } else {
                StringBuilder acronym = new StringBuilder();
                for (String word : words) {
                    String clean = word.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
                    if (clean.isEmpty())
                        continue;
                    if (!STOP_WORDS.contains(clean)) {
                        acronym.append(clean.charAt(0));
                    }
                }
                result = (acronym.length() >= 2) ? acronym.toString() : baseName;
            }
        }

        // Final formatting: Ensure " Lab" is appended if it's a lab
        if (isLab) {
            // Check if result already ends with " Lab" (case-insensitive)
            if (result.toUpperCase().endsWith(" LAB")) {
                // Normalize case to " Lab"
                return result.replaceAll("(?i) LAB$", "") + " Lab";
            }
            return result + " Lab";
        }
        return result;
    }

    private String resolveDay(String val) {
        if (val == null || val.length() < 3)
            return null;
        for (Map.Entry<String, String> entry : DAY_ALIASES.entrySet()) {
            if (val.equals(entry.getKey()) || val.startsWith(entry.getKey())) {
                return entry.getValue();
            }
        }
        for (String fullDay : DAYS) {
            if (val.contains(fullDay)) {
                return fullDay;
            }
        }
        return null;
    }

    private boolean looksLikeTime(String raw) {
        if (raw == null || raw.isBlank())
            return false;
        return TIME_RANGE.matcher(raw).find()
                || SINGLE_TIME.matcher(raw).find()
                || HOUR_ONLY.matcher(raw).find();
    }

    private boolean isValidSubject(String text) {
        if (text == null || text.isBlank())
            return false;
        String upper = text.toUpperCase().replaceAll("[^A-Z0-9:.\\-–]", "");
        if (resolveDay(upper) != null && upper.length() <= 9)
            return false;
        if (looksLikeTime(text) && text.replaceAll("[0-9:.\\-–\\sAMPMampm]", "").isEmpty())
            return false;
        String lc = text.toLowerCase().trim();
        if (lc.equals("time") || lc.equals("day") || lc.equals("period") || lc.equals("slot")
                || lc.equals("break") || lc.equals("lunch") || lc.equals("recess")
                || lc.equals("---") || lc.equals("-")) {
            return false;
        }
        return true;
    }

    private String normalizeTime(String t) {
        if (t == null || t.isBlank())
            return "";
        t = t.toUpperCase().replace(".", ":").trim();
        boolean isPm = t.contains("PM");
        boolean isAm = t.contains("AM");
        t = t.replaceAll("[A-Z\\s]", "");

        String[] parts = t.split(":");
        if (parts.length == 0 || parts[0].isBlank())
            return "";

        int h, m = 0;
        try {
            h = Integer.parseInt(parts[0]);
            if (parts.length > 1 && !parts[1].isBlank()) {
                m = Integer.parseInt(parts[1]);
            }
        } catch (NumberFormatException e) {
            return t;
        }

        if (isPm && h < 12)
            h += 12;
        if (isAm && h == 12)
            h = 0;
        // Heuristic: bare hours 1-6 are likely PM in a college timetable
        if (!isPm && !isAm && h >= 1 && h <= 6) {
            h += 12;
        }

        return String.format("%02d:%02d", h, m);
    }

    private String addOneHour(String time) {
        try {
            String[] parts = time.split(":");
            int h = Integer.parseInt(parts[0]);
            String min = parts.length > 1 ? parts[1] : "00";
            return String.format("%02d:%s", (h + 1) % 24, min);
        } catch (Exception e) {
            return "";
        }
    }

    private List<PreviewSlot> deduplicateSlots(List<PreviewSlot> slots) {
        // Aggressive deduplication: If same day/time/subject(alphanumeric), it's the
        // same lecture
        Set<String> seen = new HashSet<>();
        List<PreviewSlot> unique = new ArrayList<>();
        for (PreviewSlot s : slots) {
            String subKey = (s.getIsBreak() || s.getSubjectName() == null) ? "break-" + System.identityHashCode(s) : // Breaks
                                                                                                                     // are
                                                                                                                     // unique
                                                                                                                     // unless
                                                                                                                     // exact
                                                                                                                     // same
                                                                                                                     // time
                    s.getSubjectName().replaceAll("[^A-Za-z0-9]", "").toLowerCase();

            String groupKey = s.getGroupInfo() != null ? s.getGroupInfo().replaceAll("[^A-Za-z0-9]", "").toLowerCase()
                    : "";

            String profKey = s.getProfessor() != null ? s.getProfessor().toLowerCase().trim() : "";
            
            String key = String.format("%s|%s|%s|%s|%s",
                    s.getDayOfWeek(),
                    s.getStartTime(),
                    subKey,
                    profKey,
                    groupKey);

            if (seen.add(key)) {
                unique.add(s);
            }
        }
        return unique;
    }

    private void logGrid(List<List<String>> grid) {
        if (!log.isDebugEnabled())
            return;
        StringBuilder sb = new StringBuilder("\n=== Parsed Grid ===\n");
        for (int r = 0; r < grid.size(); r++) {
            sb.append(String.format("Row %2d: ", r));
            sb.append(grid.get(r).stream()
                    .map(c -> c.isEmpty() ? "·" : "[" + c + "]")
                    .collect(Collectors.joining(" | ")));
            sb.append("\n");
        }
        log.debug(sb.toString());
    }
}
