package com.unitrack.unitrack_backend.repository;

import com.unitrack.unitrack_backend.entity.TimetableSlot;
import com.unitrack.unitrack_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TimetableRepository extends JpaRepository<TimetableSlot, Long> {
    List<TimetableSlot> findByUserOrderByDayOfWeekAscStartTimeAsc(User user);
}