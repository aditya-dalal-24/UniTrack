package com.unitrack.unitrack_backend.repository;

import com.unitrack.unitrack_backend.entity.AttendanceRecord;
import com.unitrack.unitrack_backend.entity.AttendanceStatus;
import com.unitrack.unitrack_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findByUserOrderByDateDesc(User user);
    List<AttendanceRecord> findByUserAndDateBetweenOrderByDateAsc(User user, LocalDate start, LocalDate end);
    Optional<AttendanceRecord> findByUserAndDate(User user, LocalDate date);
    long countByUserAndStatus(User user, AttendanceStatus status);
}