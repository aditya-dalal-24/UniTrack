package com.unitrack.unitrack_backend.service;

import com.sendgrid.*;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
@Slf4j
public class EmailService {

    @Value("${app.sendgrid.api-key}")
    private String sendGridApiKey;

    @Value("${app.sendgrid.from-email}")
    private String fromEmail;

    @Value("${app.sendgrid.from-name}")
    private String fromName;

    /**
     * Sends OTP verification email via SendGrid HTTP API.
     * This uses HTTPS (port 443) which works on all cloud platforms including Render.
     */
    public void sendOtpEmail(String toEmail, String otp, String userName) {
        Email from = new Email(fromEmail, fromName);
        Email to = new Email(toEmail);
        String subject = "UniTrack - Verify Your Email";

        String html = """
                <div style="font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; padding: 60px 20px; color: #1a1a1a;">
                    <div style="max-width: 520px; margin: 0 auto; border: 2px solid #1a1a1a; padding: 48px; background: #ffffff; border-radius: 0;">
                        <!-- Header -->
                        <div style="text-align: center; margin-bottom: 48px;">
                            <div style="letter-spacing: -0.04em; font-size: 32px; font-weight: 900; color: #1a1a1a; text-transform: uppercase;">
                                UniTrack
                            </div>
                            <div style="height: 1px; width: 40px; background: #e5e7eb; margin: 16px auto;"></div>
                        </div>

                        <!-- Greeting & Context -->
                        <div style="margin-bottom: 40px;">
                            <p style="font-size: 18px; font-weight: 800; margin: 0 0 16px 0; letter-spacing: -0.01em;">Hi %s,</p>
                            <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0;">
                                Welcome to UniTrack. Use the following security code to verify your account and get started with your dashboard.
                            </p>
                        </div>

                        <!-- OTP Section -->
                        <div style="background: #1a1a1a; padding: 40px; text-align: center; margin-bottom: 40px;">
                            <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 20px 0;">
                                Verification Code
                            </p>
                            <div style="font-size: 48px; font-weight: 950; color: #ffffff; letter-spacing: 12px; margin-left: 12px; line-height: 1;">
                                %s
                            </div>
                        </div>

                        <!-- Expiry Info -->
                        <div style="text-align: center;">
                            <p style="font-size: 13px; color: #9ca3af; margin: 0;">
                                This code is valid for <strong>10 minutes</strong>.<br>
                                For your security, do not share this code with anyone.
                            </p>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="max-width: 520px; margin: 32px auto 0; text-align: center;">
                        <p style="font-size: 11px; font-weight: 700; color: #1a1a1a; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px 0;">
                            UniTrack
                        </p>
                        <p style="font-size: 10px; color: #9ca3af; letter-spacing: 0.05em; margin: 0;">
                            Built for the next generation of students.<br>
                            &copy; 2026 UniTrack. All rights reserved.
                        </p>
                    </div>
                </div>
                """
                .formatted(userName, otp);

        Content content = new Content("text/html", html);
        Mail mail = new Mail(from, subject, to, content);

        SendGrid sg = new SendGrid(sendGridApiKey);
        Request request = new Request();

        try {
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());

            Response response = sg.api(request);

            if (response.getStatusCode() >= 200 && response.getStatusCode() < 300) {
                log.info("OTP email sent successfully to {} (status: {})", toEmail, response.getStatusCode());
            } else {
                log.error("SendGrid rejected email to {}: status={}, body={}", toEmail, response.getStatusCode(), response.getBody());
                throw new RuntimeException("Failed to send verification email. SendGrid returned status: " + response.getStatusCode());
            }
        } catch (IOException e) {
            log.error("Failed to send OTP email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send verification email. Please try again.");
        }
    }
}
