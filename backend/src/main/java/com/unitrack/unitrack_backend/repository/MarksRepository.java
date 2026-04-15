package com.unitrack.unitrack_backend.repository;

import com.unitrack.unitrack_backend.entity.Marks;
import com.unitrack.unitrack_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MarksRepository extends JpaRepository<Marks, Long> {
    List<Marks> findByUser(User user);
    List<Marks> findByUserAndSemester(User user, Integer semester);
    void deleteAllByUser(User user);
}