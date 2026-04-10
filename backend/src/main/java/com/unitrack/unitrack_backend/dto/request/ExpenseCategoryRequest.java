package com.unitrack.unitrack_backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ExpenseCategoryRequest {

    @NotBlank(message = "Category name is required")
    private String name;
}