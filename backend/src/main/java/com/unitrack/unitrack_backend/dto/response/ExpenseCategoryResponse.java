package com.unitrack.unitrack_backend.dto.response;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ExpenseCategoryResponse {
    private Long id;
    private String name;
}