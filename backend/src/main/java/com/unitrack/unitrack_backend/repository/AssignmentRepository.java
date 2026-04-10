package com.unitrack.unitrack_backend.repository;

import com.unitrack.unitrack_backend.entity.Assignment;
import com.unitrack.unitrack_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByUserOrderByDueDateAsc(User user);
}