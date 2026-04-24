package com.unitrack.unitrack_backend.scratch; 
import java.util.regex.*; 
public class TestRegex { 
    public static void main(String[] args) { 
        Pattern TIME_RANGE = Pattern.compile("(\\d{1,2}[.:]\\s*\\d{2}[\\s\\u00A0]*(?:AM|PM|am|pm)?)[\\s\\u00A0]*(?:[-–—]+|[A-Z]+)[\\s\\u00A0]*(\\d{1,2}[.:]\\s*\\d{2}[\\s\\u00A0]*(?:AM|PM|am|pm)?)", Pattern.CASE_INSENSITIVE); 
        Matcher m = TIME_RANGE.matcher("9.00 to 9. 55"); 
        if (m.find()) { 
            System.out.println("Matched! Group 1: '" + m.group(1) + "', Group 2: '" + m.group(2) + "'"); 
        } else { 
            System.out.println("Failed to match '9.00 to 9. 55'"); 
        } 
    } 
}
