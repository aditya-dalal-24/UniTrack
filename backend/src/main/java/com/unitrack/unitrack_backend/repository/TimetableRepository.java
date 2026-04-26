package com.unitrack.unitrack_backend.repository;

import com.unitrack.unitrack_backend.entity.Subject;
import com.unitrack.unitrack_backend.entity.TimetableSlot;
import com.unitrack.unitrack_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface TimetableRepository extends JpaRepository<TimetableSlot, Long> {
    List<TimetableSlot> findByUserOrderByDayOfWeekAscStartTimeAsc(User user);
    List<TimetableSlot> findByUserAndDayOfWeekOrderByStartTimeAsc(User user, String dayOfWeek);
    List<TimetableSlot> findBySubject(Subject subject);
    void deleteAllByUser(User user);

    @Modifying
    @Query("UPDATE TimetableSlot t SET t.subject = null WHERE t.subject = :subject")
    void nullifySubjectReferences(@Param("subject") Subject subject);
}