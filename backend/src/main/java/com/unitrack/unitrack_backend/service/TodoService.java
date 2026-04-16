package com.unitrack.unitrack_backend.service;

import com.unitrack.unitrack_backend.dto.request.TodoRequest;
import com.unitrack.unitrack_backend.dto.response.TodoResponse;
import com.unitrack.unitrack_backend.entity.Todo;
import com.unitrack.unitrack_backend.entity.User;
import com.unitrack.unitrack_backend.exception.ResourceNotFoundException;
import com.unitrack.unitrack_backend.repository.TodoRepository;
import com.unitrack.unitrack_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class TodoService {

    private final TodoRepository todoRepository;
    private final UserRepository userRepository;

    private User getUser(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    private TodoResponse mapToResponse(Todo todo) {
        return TodoResponse.builder()
                .id(todo.getId())
                .title(todo.getTitle())
                .description(todo.getDescription())
                .dueDate(todo.getDueDate())
                .dueTime(todo.getDueTime())
                .completed(todo.isCompleted())
                .build();
    }

    public List<TodoResponse> getAll(Principal principal, Boolean completed) {
        User user = getUser(principal);
        List<Todo> todos;
        if (completed != null) {
            todos = todoRepository.findByUserAndCompletedOrderByDueDateAsc(user, completed);
        } else {
            todos = todoRepository.findByUserOrderByDueDateAsc(user);
        }
        return todos.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public TodoResponse create(Principal principal, TodoRequest request) {
        User user = getUser(principal);
        Todo todo = Todo.builder()
                .user(user)
                .title(request.getTitle())
                .description(request.getDescription())
                .dueDate(request.getDueDate())
                .dueTime(request.getDueTime())
                .completed(request.isCompleted())
                .build();
        todoRepository.save(todo);
        return mapToResponse(todo);
    }

    public TodoResponse update(Principal principal, Long id, TodoRequest request) {
        User user = getUser(principal);
        Todo todo = todoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Todo not found"));
        if (!todo.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        todo.setTitle(request.getTitle());
        todo.setDescription(request.getDescription());
        todo.setDueDate(request.getDueDate());
        todo.setDueTime(request.getDueTime());
        todo.setCompleted(request.isCompleted());
        todoRepository.save(todo);
        return mapToResponse(todo);
    }

    public void delete(Principal principal, Long id) {
        User user = getUser(principal);
        Todo todo = todoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Todo not found"));
        if (!todo.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        todoRepository.delete(todo);
    }

    public void deleteAll(Principal principal) {
        User user = getUser(principal);
        todoRepository.deleteAllByUser(user);
    }
}