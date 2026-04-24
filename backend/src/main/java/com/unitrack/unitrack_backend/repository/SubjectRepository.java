package com.unitrack.unitrack_backend.repository;

import com.unitrack.unitrack_backend.entity.Subject;
import com.unitrack.unitrack_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SubjectRepository extends JpaRepository<Subject, Long> {
    List<Subject> findByUser(User user);
    List<Subject> findByUserAndSemester(User user, Integer semester);

    @Query("SELECT s FROM Subject s WHERE s.user = :user AND (s.semester = :semester OR s.semester IS NULL)")
    List<Subject> findByUserAndSemesterOrSemesterIsNull(@Param("user") User user, @Param("semester") Integer semester);

    void deleteAllByUser(User user);
}