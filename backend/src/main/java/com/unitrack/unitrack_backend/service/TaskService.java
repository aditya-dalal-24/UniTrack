package com.unitrack.unitrack_backend.service;

import com.unitrack.unitrack_backend.dto.request.TaskRequest;
import com.unitrack.unitrack_backend.dto.response.TaskResponse;
import com.unitrack.unitrack_backend.entity.*;
import com.unitrack.unitrack_backend.exception.ResourceNotFoundException;
import com.unitrack.unitrack_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final AssignmentRepository assignmentRepository;
    private final TodoRepository todoRepository;

    private User getUser(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    private TaskResponse mapToResponse(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .subject(task.getSubject())
                .dueDate(task.getDueDate())
                .dueTime(task.getDueTime())
                .status(task.getStatus())
                .type(task.getType())
                .build();
    }

    public List<TaskResponse> getTasks(Principal principal, TaskType type) {
        User user = getUser(principal);
        List<Task> tasks;
        if (type != null) {
            tasks = taskRepository.findByUserAndTypeOrderByDueDateAsc(user, type);
        } else {
            tasks = taskRepository.findByUserOrderByDueDateAsc(user);
        }
        return tasks.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public TaskResponse createTask(Principal principal, TaskRequest request) {
        User user = getUser(principal);
        Task task = Task.builder()
                .user(user)
                .title(request.getTitle())
                .description(request.getDescription())
                .subject(request.getSubject())
                .dueDate(request.getDueDate())
                .dueTime(request.getDueTime())
                .status(request.getStatus() != null ? request.getStatus() : TaskStatus.PENDING)
                .type(request.getType() != null ? request.getType() : TaskType.TODO)
                .build();
        taskRepository.save(task);
        return mapToResponse(task);
    }

    public TaskResponse updateTask(Principal principal, Long id, TaskRequest request) {
        User user = getUser(principal);
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        if (!task.getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Task not found");
        }
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setSubject(request.getSubject());
        task.setDueDate(request.getDueDate());
        task.setDueTime(request.getDueTime());
        task.setStatus(request.getStatus());
        task.setType(request.getType());
        taskRepository.save(task);
        return mapToResponse(task);
    }

    public void deleteTask(Principal principal, Long id) {
        User user = getUser(principal);
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        if (!task.getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Task not found");
        }
        taskRepository.delete(task);
    }

    @Transactional
    public void deleteAllTasks(Principal principal) {
        User user = getUser(principal);
        taskRepository.deleteAllByUser(user);
    }

    /**
     * One-time migration: copies existing Assignments and Todos into the unified Tasks table.
     * Safe to call multiple times — checks if tasks already exist before migrating.
     */
    @Transactional
    public int migrateData(Principal principal) {
        User user = getUser(principal);

        // Check if migration already happened
        List<Task> existingTasks = taskRepository.findByUserOrderByDueDateAsc(user);
        if (!existingTasks.isEmpty()) {
            return 0; // Already migrated
        }

        int count = 0;

        // Migrate Assignments
        List<Assignment> assignments = assignmentRepository.findByUserOrderByDueDateAsc(user);
        for (Assignment a : assignments) {
            TaskStatus status;
            if (a.getStatus() == AssignmentStatus.SUBMITTED) {
                status = TaskStatus.SUBMITTED;
            } else if (a.getStatus() == AssignmentStatus.OVERDUE) {
                status = TaskStatus.OVERDUE;
            } else {
                status = TaskStatus.PENDING;
            }

            Task task = Task.builder()
                    .user(user)
                    .title(a.getTitle())
                    .description(null)
                    .subject(a.getSubject())
                    .dueDate(a.getDueDate())
                    .dueTime(null)
                    .status(status)
                    .type(TaskType.ASSIGNMENT)
                    .build();
            taskRepository.save(task);
            count++;
        }

        // Migrate Todos
        List<Todo> todos = todoRepository.findByUserOrderByDueDateAsc(user);
        for (Todo t : todos) {
            TaskStatus status = t.isCompleted() ? TaskStatus.COMPLETED : TaskStatus.PENDING;

            Task task = Task.builder()
                    .user(user)
                    .title(t.getTitle())
                    .description(t.getDescription())
                    .subject(null)
                    .dueDate(t.getDueDate())
                    .dueTime(t.getDueTime() != null ? t.getDueTime().toString() : null)
                    .status(status)
                    .type(TaskType.TODO)
                    .build();
            taskRepository.save(task);
            count++;
        }

        return count;
    }
}
