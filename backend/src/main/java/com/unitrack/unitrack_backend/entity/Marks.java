package com.unitrack.unitrack_backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "marks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Marks {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String subjectName;

    private String subjectCode;
    private Integer semester;
    private Integer credits;
    private Double midSem;
    private Double internals;
    private Double endSem;
    private Double finalScore;
    private String grade;
    private Double gradePoints;
}