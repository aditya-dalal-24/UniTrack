package com.unitrack.unitrack_backend.repository;

import com.unitrack.unitrack_backend.entity.Task;
import com.unitrack.unitrack_backend.entity.TaskType;
import com.unitrack.unitrack_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByUserOrderByDueDateAsc(User user);
    List<Task> findByUserAndTypeOrderByDueDateAsc(User user, TaskType type);
    void deleteAllByUser(User user);
}
