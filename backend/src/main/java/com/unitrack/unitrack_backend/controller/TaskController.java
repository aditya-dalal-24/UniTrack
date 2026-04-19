package com.unitrack.unitrack_backend.controller;

import com.unitrack.unitrack_backend.dto.request.TaskRequest;
import com.unitrack.unitrack_backend.dto.response.TaskResponse;
import com.unitrack.unitrack_backend.entity.TaskType;
import com.unitrack.unitrack_backend.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @GetMapping
    public ResponseEntity<List<TaskResponse>> getTasks(
            Principal principal,
            @RequestParam(required = false) String type) {
        TaskType taskType = null;
        if (type != null && !type.isEmpty()) {
            taskType = TaskType.valueOf(type.toUpperCase());
        }
        return ResponseEntity.ok(taskService.getTasks(principal, taskType));
    }

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(
            Principal principal,
            @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.ok(taskService.createTask(principal, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskResponse> updateTask(
            Principal principal,
            @PathVariable Long id,
            @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.ok(taskService.updateTask(principal, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(Principal principal, @PathVariable Long id) {
        taskService.deleteTask(principal, id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAllTasks(Principal principal) {
        taskService.deleteAllTasks(principal);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/migrate")
    public ResponseEntity<Map<String, Object>> migrate(Principal principal) {
        int count = taskService.migrateData(principal);
        return ResponseEntity.ok(Map.of("migrated", count));
    }
}
