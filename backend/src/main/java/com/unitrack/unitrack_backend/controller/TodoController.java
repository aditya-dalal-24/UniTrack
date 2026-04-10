package com.unitrack.unitrack_backend.controller;

import com.unitrack.unitrack_backend.dto.request.TodoRequest;
import com.unitrack.unitrack_backend.dto.response.TodoResponse;
import com.unitrack.unitrack_backend.service.TodoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/todos")
@RequiredArgsConstructor
public class TodoController {

    private final TodoService todoService;

    @GetMapping
    public ResponseEntity<List<TodoResponse>> getAll(
            Principal principal,
            @RequestParam(required = false) Boolean completed) {
        return ResponseEntity.ok(todoService.getAll(principal, completed));
    }

    @PostMapping
    public ResponseEntity<TodoResponse> create(Principal principal,
                                               @Valid @RequestBody TodoRequest request) {
        return ResponseEntity.ok(todoService.create(principal, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TodoResponse> update(Principal principal,
                                               @PathVariable Long id,
                                               @Valid @RequestBody TodoRequest request) {
        return ResponseEntity.ok(todoService.update(principal, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Principal principal, @PathVariable Long id) {
        todoService.delete(principal, id);
        return ResponseEntity.noContent().build();
    }
}