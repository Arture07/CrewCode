package com.codesync.sessionservice.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "ai_chat", indexes = {
    @Index(name = "idx_ai_chat_session", columnList = "session_id"),
    @Index(name = "idx_ai_chat_chat_id", columnList = "chat_id"),
    @Index(name = "idx_ai_chat_username", columnList = "username")
})
public class AIChat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "chat_id", nullable = false, length = 100)
    private String chatId;

    @Column(name = "session_id", length = 100)
    private String sessionId;

    @Column(length = 50)
    private String username;

    @Column(length = 255)
    private String title;

    @Column(name = "messages_json", columnDefinition = "TEXT")
    private String messagesJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public AIChat() {
    }

    public AIChat(String chatId, String sessionId, String username, String title, String messagesJson) {
        this.chatId = chatId;
        this.sessionId = sessionId;
        this.username = username;
        this.title = title;
        this.messagesJson = messagesJson;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getChatId() {
        return chatId;
    }

    public void setChatId(String chatId) {
        this.chatId = chatId;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessagesJson() {
        return messagesJson;
    }

    public void setMessagesJson(String messagesJson) {
        this.messagesJson = messagesJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
