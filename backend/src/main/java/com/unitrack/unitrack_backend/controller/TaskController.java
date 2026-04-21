package com.unitrack.unitrack_backend.controller;

import com.unitrack.unitrack_backend.dto.request.TaskRequest;
import com.unitrack.unitrack_backend.dto.response.TaskResponse;
import com.unitrack.unitrack_backend.entity.TaskType;
import com.unitrack.unitrack_backend.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
    public ResponseEntity<?> getTasks(
            Principal principal,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        TaskType taskType = null;
        if (type != null && !type.isEmpty()) {
            taskType = TaskType.valueOf(type.toUpperCase());
        }
        // If pagination params are provided, return Page; otherwise return List for backward compat
        if (page != null && size != null) {
            Pageable pageable = PageRequest.of(page, size);
            return ResponseEntity.ok(taskService.getTasksPaged(principal, taskType, pageable));
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

}

