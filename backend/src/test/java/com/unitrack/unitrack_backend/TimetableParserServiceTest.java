package com.unitrack.unitrack_backend;

import org.junit.jupiter.api.Test;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;

class TimetableParserServiceTest {

    private static final Pattern TIME_RANGE = Pattern.compile(
            "(\\d{1,2}[.:]\\s*\\d{2}[\\s\\u00A0]*(?:AM|PM)?)[\\s\\u00A0]*(?:[-–—]+|[A-Z]+)[\\s\\u00A0]*(\\d{1,2}[.:]\\s*\\d{2}[\\s\\u00A0]*(?:AM|PM)?)",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern COURSE_CODE = Pattern.compile(
            "(?:^|\\s)([A-Z]{2,5}[\\s-]?[0-9]{2,4}[A-Z]?|[0-9]{2,4}[A-Z]{2,5}[0-9]{2,4}[A-Z]?)(?:\\s|$)",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern ROOM_PATTERN = Pattern.compile(
            "(?:Room|Rm|R|Lab|LH|Hall|Venue|Class)[\\s.:_-]*([A-Z]?\\d{1,4}[A-Z]?)",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern PROF_PATTERN = Pattern.compile(
            "(?:Prof\\.?|Dr\\.?|Lecturer|Faculty|Instructor)[:\\s]+([A-Za-z .]+)",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern BREAK_PATTERN = Pattern.compile(
            ".*\\b(BREAK|LUNCH|RECESS|INTERVAL)\\b.*",
            Pattern.CASE_INSENSITIVE);

    private static final Pattern LEGEND_ENTRY = Pattern.compile(
            "^\\s*\\(?([A-Z0-9][A-Z0-9\\-]{1,15})\\)?\\s*[-–=:]\\s*(.+)$",
            Pattern.CASE_INSENSITIVE);

    @Test
    void testTimeRangePattern() {
        Matcher m1 = TIME_RANGE.matcher("9.00 to 9. 55");
        assertTrue(m1.find());
        assertEquals("9.00", m1.group(1).trim());
        assertTrue(m1.group(2).contains("9"));

        Matcher m2 = TIME_RANGE.matcher("10:00 AM - 11:30 AM");
        assertTrue(m2.find());
        assertEquals("10:00 AM", m2.group(1).trim());
        assertEquals("11:30 AM", m2.group(2).trim());

        Matcher m3 = TIME_RANGE.matcher("09:00 - 10:00");
        assertTrue(m3.find());
        assertEquals("09:00", m3.group(1).trim());
        assertEquals("10:00", m3.group(2).trim());
    }

    @Test
    void testCourseCodePattern() {
        Matcher m1 = COURSE_CODE.matcher("CS101 Intro to Programming");
        assertTrue(m1.find());
        assertEquals("CS101", m1.group(1).trim());

        Matcher m2 = COURSE_CODE.matcher("Advanced Math MAT-202");
        assertTrue(m2.find());
        assertEquals("MAT-202", m2.group(1).trim());
    }

    @Test
    void testRoomPattern() {
        Matcher m1 = ROOM_PATTERN.matcher("Lecture in Room 402");
        assertTrue(m1.find());
        assertEquals("402", m1.group(1).trim());

        Matcher m2 = ROOM_PATTERN.matcher("Practical in Lab 3");
        assertTrue(m2.find());
        assertEquals("3", m2.group(1).trim());

        Matcher m3 = ROOM_PATTERN.matcher("LH-12");
        assertTrue(m3.find());
        assertEquals("12", m3.group(1).trim());
    }

    @Test
    void testFacultyPattern() {
        Matcher m1 = PROF_PATTERN.matcher("Prof. Alan Turing");
        assertTrue(m1.find());
        assertEquals("Alan Turing", m1.group(1).trim());

        Matcher m2 = PROF_PATTERN.matcher("Dr. Ada Lovelace");
        assertTrue(m2.find());
        assertEquals("Ada Lovelace", m2.group(1).trim());
    }

    @Test
    void testBreakPattern() {
        assertTrue(BREAK_PATTERN.matcher("LUNCH BREAK").matches());
        assertTrue(BREAK_PATTERN.matcher("Tea Break (10 mins)").matches());
        assertTrue(BREAK_PATTERN.matcher("RECESS").matches());
        assertFalse(BREAK_PATTERN.matcher("Data Structures Lecture").matches());
    }

    @Test
    void testLegendEntryPattern() {
        Matcher m1 = LEGEND_ENTRY.matcher("DAA - Design and Analysis of Algorithms");
        assertTrue(m1.find());
        assertEquals("DAA", m1.group(1).trim());
        assertEquals("Design and Analysis of Algorithms", m1.group(2).trim());

        Matcher m2 = LEGEND_ENTRY.matcher("RVS: Prof. R.V. Sharma");
        assertTrue(m2.find());
        assertEquals("RVS", m2.group(1).trim());
        assertEquals("Prof. R.V. Sharma", m2.group(2).trim());
    }
}
