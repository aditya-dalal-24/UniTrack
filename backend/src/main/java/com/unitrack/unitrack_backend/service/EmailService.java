package com.unitrack.unitrack_backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import org.springframework.scheduling.annotation.Async;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Async
    public void sendOtpEmail(String toEmail, String otp, String userName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(toEmail);
            helper.setSubject("UniTrack — Verify Your Email");
            helper.setFrom("alter.aura.24@gmail.com");

            String html = """
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">UniTrack</h1>
                        <p style="font-size: 14px; color: #64748b; margin-top: 4px;">Student Management Portal</p>
                    </div>
                    <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
                        <p style="font-size: 16px; color: #1e293b; margin: 0 0 8px 0;">Hi %s,</p>
                        <p style="font-size: 14px; color: #475569; margin: 0 0 24px 0;">Use the verification code below to complete your signup:</p>
                        <div style="text-align: center; margin: 24px 0;">
                            <div style="display: inline-block; background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 16px 32px; letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #0f172a;">%s</div>
                        </div>
                        <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 24px 0 0 0;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
                    </div>
                    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px;">&copy; UniTrack. All rights reserved.</p>
                </div>
                """.formatted(userName, otp);

            helper.setText(html, true);
            mailSender.send(message);
            log.info("OTP email sent to {}", toEmail);
        } catch (MessagingException e) {
            log.error("Failed to send OTP email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send verification email. Please try again.");
        }
    }
}
