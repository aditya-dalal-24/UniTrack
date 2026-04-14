package com.unitrack.unitrack_backend.repository;

import com.unitrack.unitrack_backend.entity.AttendanceRecord;
import com.unitrack.unitrack_backend.entity.AttendanceStatus;
import com.unitrack.unitrack_backend.entity.Subject;
import com.unitrack.unitrack_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findByUserOrderByDateDesc(User user);
    List<AttendanceRecord> findByUserAndDateBetweenOrderByDateAsc(User user, LocalDate start, LocalDate end);
    Optional<AttendanceRecord> findByUserAndDate(User user, LocalDate date);
    Optional<AttendanceRecord> findByUserAndDateAndSubject(User user, LocalDate date, Subject subject);
    Optional<AttendanceRecord> findByUserAndDateAndSubjectIsNull(User user, LocalDate date);
    List<AttendanceRecord> findByUserAndDate(User user, LocalDate date, org.springframework.data.domain.Sort sort);
    long countByUserAndStatus(User user, AttendanceStatus status);
    long countByUserAndStatusAndSubject(User user, AttendanceStatus status, Subject subject);
    long countByUserAndSubject(User user, Subject subject);
    void deleteByUserAndDate(User user, LocalDate date);
}