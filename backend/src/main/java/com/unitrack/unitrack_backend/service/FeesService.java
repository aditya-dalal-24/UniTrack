package com.unitrack.unitrack_backend.service;

import com.unitrack.unitrack_backend.dto.request.FeesRequest;
import com.unitrack.unitrack_backend.dto.response.FeesResponse;
import com.unitrack.unitrack_backend.dto.response.FeesSummaryResponse;
import com.unitrack.unitrack_backend.entity.Fees;
import com.unitrack.unitrack_backend.entity.FeesStatus;
import com.unitrack.unitrack_backend.entity.User;
import com.unitrack.unitrack_backend.exception.ResourceNotFoundException;
import com.unitrack.unitrack_backend.repository.FeesRepository;
import com.unitrack.unitrack_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeesService {

    private final FeesRepository feeRepository;
    private final UserRepository userRepository;

    private User getUser(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    private FeesResponse mapToResponse(Fees fee) {
        double total = fee.getTotalAmount() != null ? fee.getTotalAmount() : 0.0;
        double paid = fee.getPaidAmount() != null ? fee.getPaidAmount() : 0.0;
        return FeesResponse.builder()
                .id(fee.getId())
                .semester(fee.getSemester())
                .category(fee.getCategory())
                .totalAmount(total)
                .paidAmount(paid)
                .pendingAmount(Math.round((total - paid) * 100.0) / 100.0)
                .dueDate(fee.getDueDate())
                .paidDate(fee.getPaidDate())
                .status(fee.getStatus())
                .receiptData(fee.getReceiptData())
                .receiptFileName(fee.getReceiptFileName())
                .build();
    }

    public FeesSummaryResponse getSummary(Principal principal, Integer semester) {
        User user = getUser(principal);

        List<Fees> allFees = feeRepository.findByUser(user);
        List<Fees> filteredFees = semester != null
                ? feeRepository.findByUserAndSemester(user, semester)
                : allFees;

        double totalFees = filteredFees.stream()
                .mapToDouble(f -> f.getTotalAmount() != null ? f.getTotalAmount() : 0.0).sum();
        double totalPaid = filteredFees.stream()
                .mapToDouble(f -> f.getPaidAmount() != null ? f.getPaidAmount() : 0.0).sum();

        Integer currentSemester = allFees.stream()
                .filter(f -> f.getSemester() != null)
                .mapToInt(Fees::getSemester)
                .max().orElse(0);

        List<FeesResponse> responses = filteredFees.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return FeesSummaryResponse.builder()
                .totalFees(Math.round(totalFees * 100.0) / 100.0)
                .totalPaid(Math.round(totalPaid * 100.0) / 100.0)
                .totalPending(Math.round((totalFees - totalPaid) * 100.0) / 100.0)
                .currentSemester(currentSemester)
                .fees(responses)
                .build();
    }

    public FeesResponse create(Principal principal, FeesRequest request) {
        User user = getUser(principal);
        Fees fee = Fees.builder()
                .user(user)
                .semester(request.getSemester())
                .category(request.getCategory())
                .totalAmount(request.getTotalAmount())
                .paidAmount(request.getPaidAmount())
                .dueDate(request.getDueDate())
                .paidDate(request.getPaidDate())
                .status(request.getStatus() != null ? request.getStatus() : FeesStatus.PENDING)
                .receiptData(request.getReceiptData())
                .receiptFileName(request.getReceiptFileName())
                .build();
        feeRepository.save(fee);
        return mapToResponse(fee);
    }

    public FeesResponse update(Principal principal, Long id, FeesRequest request) {
        User user = getUser(principal);
        Fees fee = feeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fee not found"));
        if (!fee.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        fee.setSemester(request.getSemester());
        fee.setCategory(request.getCategory());
        fee.setTotalAmount(request.getTotalAmount());
        fee.setPaidAmount(request.getPaidAmount());
        fee.setDueDate(request.getDueDate());
        fee.setPaidDate(request.getPaidDate());
        fee.setStatus(request.getStatus());
        if (request.getReceiptData() != null) {
            fee.setReceiptData(request.getReceiptData());
            fee.setReceiptFileName(request.getReceiptFileName());
        }
        feeRepository.save(fee);
        return mapToResponse(fee);
    }

    public void delete(Principal principal, Long id) {
        User user = getUser(principal);
        Fees fee = feeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fee not found"));
        if (!fee.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        feeRepository.delete(fee);
    }
}