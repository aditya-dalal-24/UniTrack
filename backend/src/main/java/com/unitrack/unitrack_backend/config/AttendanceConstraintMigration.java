package com.unitrack.unitrack_backend.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * One-time migration to fix the attendance_records unique constraint.
 * Old constraint was on (user_id, date, timetable_slot_id) which caused
 * duplicate inserts for labs spanning 2 slots with the same subject.
 * New constraint is on (user_id, date, subject_id) — one record per subject per day.
 *
 * Safe to run multiple times (idempotent).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AttendanceConstraintMigration {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void migrateConstraints() {
        try {
            // Drop the old auto-generated Hibernate constraint on (user_id, date, timetable_slot_id)
            // The name is auto-generated, so we look it up dynamically
            var oldConstraints = jdbcTemplate.queryForList(
                """
                SELECT constraint_name FROM information_schema.table_constraints
                WHERE table_name = 'attendance_records'
                  AND constraint_type = 'UNIQUE'
                  AND constraint_name != 'uk_attendance_user_date_subject'
                """
            );

            for (var row : oldConstraints) {
                String constraintName = (String) row.get("constraint_name");
                // Only drop unique constraints that are NOT our target one
                // Check if this constraint involves timetable_slot_id
                var columns = jdbcTemplate.queryForList(
                    """
                    SELECT column_name FROM information_schema.constraint_column_usage
                    WHERE constraint_name = ? AND table_name = 'attendance_records'
                    """,
                    constraintName
                );
                boolean hasTimetableSlot = columns.stream()
                        .anyMatch(c -> "timetable_slot_id".equals(c.get("column_name")));
                if (hasTimetableSlot) {
                    log.info("Dropping old attendance constraint: {}", constraintName);
                    jdbcTemplate.execute("ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS " + constraintName);
                }
            }

            // Remove duplicate rows BEFORE creating the new constraint
            // Keep only the most recent record (highest id) per (user_id, date, subject_id)
            int deleted = jdbcTemplate.update(
                """
                DELETE FROM attendance_records a
                USING attendance_records b
                WHERE a.user_id = b.user_id
                  AND a.date = b.date
                  AND a.subject_id = b.subject_id
                  AND a.subject_id IS NOT NULL
                  AND a.id < b.id
                """
            );
            if (deleted > 0) {
                log.info("Cleaned up {} duplicate attendance rows", deleted);
            }

            // Create the new constraint if it doesn't already exist
            var existing = jdbcTemplate.queryForList(
                """
                SELECT 1 FROM information_schema.table_constraints
                WHERE table_name = 'attendance_records'
                  AND constraint_name = 'uk_attendance_user_date_subject'
                """
            );
            if (existing.isEmpty()) {
                log.info("Creating new unique constraint uk_attendance_user_date_subject");
                jdbcTemplate.execute(
                    """
                    ALTER TABLE attendance_records
                    ADD CONSTRAINT uk_attendance_user_date_subject
                    UNIQUE (user_id, date, subject_id)
                    """
                );
            }

            log.info("Attendance constraint migration completed successfully");
        } catch (Exception e) {
            log.warn("Attendance constraint migration skipped or failed (may already be correct): {}", e.getMessage());
        }
    }
}
