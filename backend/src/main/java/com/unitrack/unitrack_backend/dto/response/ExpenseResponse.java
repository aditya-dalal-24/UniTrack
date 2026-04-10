package com.unitrack.unitrack_backend.dto.response;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ExpenseResponse {
    private Long id;
    private Double amount;
    private String categoryName;
    private Long categoryId;
    private LocalDate date;
    private LocalTime time;
    private String note;
}