package com.unitrack.unitrack_backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class ExpenseRequest {

    @NotNull(message = "Amount is required")
    private Double amount;

    private Long categoryId;
    private LocalDate date;
    private LocalTime time;
    private String note;
}