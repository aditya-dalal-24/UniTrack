package com.unitrack.unitrack_backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "subjects", indexes = {
    @Index(name = "idx_subjects_user_id", columnList = "user_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String name;

    private String fullName;

    private Integer semester;
    private String courseCode;
    private String professor;
    private String roomNumber;
    private String color;
}