package com.unitrack.unitrack_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "fees")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Fees {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private Integer semester;
    private String category;
    private Double totalAmount;
    private Double paidAmount;
    private LocalDate dueDate;
    private LocalDate paidDate;

    @Enumerated(EnumType.STRING)
    private FeesStatus status;
}