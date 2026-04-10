package com.unitrack.unitrack_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "todos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Todo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    private String description;
    private LocalDate dueDate;
    private LocalTime dueTime;
    private boolean completed;
}