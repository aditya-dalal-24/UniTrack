package com.unitrack.unitrack_backend.repository;

import com.unitrack.unitrack_backend.entity.Task;
import com.unitrack.unitrack_backend.entity.TaskType;
import com.unitrack.unitrack_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByUserOrderByDueDateAsc(User user);
    Page<Task> findByUserOrderByDueDateAsc(User user, Pageable pageable);
    
    List<Task> findByUserAndTypeOrderByDueDateAsc(User user, TaskType type);
    Page<Task> findByUserAndTypeOrderByDueDateAsc(User user, TaskType type, Pageable pageable);
    
    void deleteAllByUser(User user);
}
