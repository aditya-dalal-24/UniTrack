package com.unitrack.unitrack_backend.repository;

import com.unitrack.unitrack_backend.entity.Todo;
import com.unitrack.unitrack_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TodoRepository extends JpaRepository<Todo, Long> {
    List<Todo> findByUserOrderByDueDateAsc(User user);
    List<Todo> findByUserAndCompletedOrderByDueDateAsc(User user, boolean completed);
}