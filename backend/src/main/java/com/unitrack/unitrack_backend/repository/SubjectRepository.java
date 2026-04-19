package com.unitrack.unitrack_backend.repository;

import com.unitrack.unitrack_backend.entity.Subject;
import com.unitrack.unitrack_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SubjectRepository extends JpaRepository<Subject, Long> {
    List<Subject> findByUser(User user);
    List<Subject> findByUserAndSemester(User user, Integer semester);
    List<Subject> findByUserAndSemesterOrSemesterIsNull(User user, Integer semester);
    void deleteAllByUser(User user);
}