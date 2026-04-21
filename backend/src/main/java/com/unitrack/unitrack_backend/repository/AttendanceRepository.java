package com.unitrack.unitrack_backend.repository;

import com.unitrack.unitrack_backend.entity.AttendanceRecord;
import com.unitrack.unitrack_backend.entity.AttendanceStatus;
import com.unitrack.unitrack_backend.entity.Subject;
import com.unitrack.unitrack_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AttendanceRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findByUserOrderByDateDesc(User user);
    List<AttendanceRecord> findByUserAndDateBetweenOrderByDateAsc(User user, LocalDate start, LocalDate end);
    Optional<AttendanceRecord> findByUserAndDate(User user, LocalDate date);
    Optional<AttendanceRecord> findByUserAndDateAndSubject(User user, LocalDate date, Subject subject);
    Optional<AttendanceRecord> findByUserAndDateAndTimetableSlot(User user, LocalDate date, com.unitrack.unitrack_backend.entity.TimetableSlot timetableSlot);
    Optional<AttendanceRecord> findByUserAndDateAndSubjectIsNull(User user, LocalDate date);
    List<AttendanceRecord> findByUserAndDate(User user, LocalDate date, org.springframework.data.domain.Sort sort);
    long countByUserAndStatus(User user, AttendanceStatus status);
    long countByUserAndStatusAndSubject(User user, AttendanceStatus status, Subject subject);
    long countByUserAndSubject(User user, Subject subject);
    
    // Aggregated Attendance Query
    @Query("SELECT a.subject.name AS subjectName, " +
           "SUM(CASE WHEN a.status = com.unitrack.unitrack_backend.entity.AttendanceStatus.PRESENT THEN 1 ELSE 0 END) AS presentCount, " +
           "COUNT(a) AS totalCount " +
           "FROM AttendanceRecord a WHERE a.user = :user AND a.subject IS NOT NULL " +
           "GROUP BY a.subject.name")
    List<Object[]> getSubjectAttendanceSummary(@Param("user") User user);
    void deleteByUserAndDate(User user, LocalDate date);
    void deleteAllByUser(User user);
    @Modifying
    @Query("DELETE FROM AttendanceRecord a WHERE a.timetableSlot = :timetableSlot")
    void deleteByTimetableSlot(@Param("timetableSlot") com.unitrack.unitrack_backend.entity.TimetableSlot timetableSlot);
}