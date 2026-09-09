package com.crewcode.sessionservice.service;

import com.crewcode.sessionservice.model.AIChat;
import com.crewcode.sessionservice.repository.AIChatRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class AIChatService {

    private static final Logger log = LoggerFactory.getLogger(AIChatService.class);
    private static final int MAX_CHATS_PER_SESSION = 50;

    private final AIChatRepository aiChatRepository;
    private final ObjectMapper objectMapper;

    public AIChatService(AIChatRepository aiChatRepository, ObjectMapper objectMapper) {
        this.aiChatRepository = aiChatRepository;
        this.objectMapper = objectMapper;
    }

    public List<Map<String, Object>> getChatsForSession(String sessionId, String username) {
        List<AIChat> entities;
        if (sessionId != null && !sessionId.isBlank()) {
            entities = aiChatRepository.findBySessionIdOrderByUpdatedAtDesc(sessionId, PageRequest.of(0, MAX_CHATS_PER_SESSION));
        } else if (username != null && !username.isBlank() && !"anonymous".equalsIgnoreCase(username)) {
            entities = aiChatRepository.findByUsernameOrderByUpdatedAtDesc(username, PageRequest.of(0, MAX_CHATS_PER_SESSION));
        } else {
            return Collections.emptyList();
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (AIChat chat : entities) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", chat.getChatId());
            map.put("title", chat.getTitle());
            map.put("username", chat.getUsername());
            map.put("sessionId", chat.getSessionId());
            map.put("updatedAt", chat.getUpdatedAt() != null ? chat.getUpdatedAt().toEpochMilli() : System.currentTimeMillis());
            map.put("createdAt", chat.getCreatedAt() != null ? chat.getCreatedAt().toEpochMilli() : System.currentTimeMillis());

            try {
                if (chat.getMessagesJson() != null && !chat.getMessagesJson().isBlank()) {
                    List<Object> msgs = objectMapper.readValue(chat.getMessagesJson(), new TypeReference<List<Object>>() {});
                    map.put("messages", msgs);
                } else {
                    map.put("messages", Collections.emptyList());
                }
            } catch (Exception e) {
                log.warn("Failed to parse messagesJson for chat {}: {}", chat.getChatId(), e.getMessage());
                map.put("messages", Collections.emptyList());
            }

            result.add(map);
        }
        return result;
    }

    @Transactional
    public Map<String, Object> saveOrUpdateChat(String chatId, String sessionId, String username, String title, Object messages) {
        if (chatId == null || chatId.isBlank()) {
            chatId = UUID.randomUUID().toString();
        }

        String messagesJson;
        try {
            if (messages instanceof String) {
                messagesJson = (String) messages;
            } else {
                messagesJson = objectMapper.writeValueAsString(messages);
            }
        } catch (Exception e) {
            log.error("Failed to serialize messages for chat {}: {}", chatId, e.getMessage());
            messagesJson = "[]";
        }

        Optional<AIChat> existing = (sessionId != null && !sessionId.isBlank())
                ? aiChatRepository.findFirstByChatIdAndSessionId(chatId, sessionId)
                : aiChatRepository.findFirstByChatId(chatId);

        AIChat chat;
        if (existing.isPresent()) {
            chat = existing.get();
            if (title != null && !title.isBlank()) {
                chat.setTitle(title);
            }
            if (username != null && !username.isBlank()) {
                chat.setUsername(username);
            }
            chat.setMessagesJson(messagesJson);
            chat.setUpdatedAt(Instant.now());
        } else {
            String safeTitle = (title != null && !title.isBlank()) ? title : "Novo Chat";
            if (safeTitle.length() > 250) {
                safeTitle = safeTitle.substring(0, 247) + "...";
            }
            chat = new AIChat(chatId, sessionId, username, safeTitle, messagesJson);
        }

        AIChat saved = aiChatRepository.save(chat);

        // Prune older chats if session exceeds limit
        if (sessionId != null && !sessionId.isBlank()) {
            try {
                long count = aiChatRepository.countBySessionId(sessionId);
                if (count > MAX_CHATS_PER_SESSION) {
                    List<AIChat> allSessionChats = aiChatRepository.findBySessionIdOrderByUpdatedAtDesc(sessionId);
                    if (allSessionChats.size() > MAX_CHATS_PER_SESSION) {
                        List<AIChat> toRemove = allSessionChats.subList(MAX_CHATS_PER_SESSION, allSessionChats.size());
                        aiChatRepository.deleteAll(toRemove);
                        log.debug("Pruned {} old AI chats for session {}", toRemove.size(), sessionId);
                    }
                }
            } catch (Exception e) {
                log.debug("Chat pruning non-fatal error: {}", e.getMessage());
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", saved.getChatId());
        response.put("title", saved.getTitle());
        response.put("sessionId", saved.getSessionId());
        response.put("updatedAt", saved.getUpdatedAt().toEpochMilli());
        return response;
    }

    @Transactional
    public void deleteChat(String chatId, String sessionId) {
        if (chatId == null || chatId.isBlank()) return;
        if (sessionId != null && !sessionId.isBlank()) {
            aiChatRepository.deleteByChatIdAndSessionId(chatId, sessionId);
        } else {
            aiChatRepository.deleteByChatId(chatId);
        }
    }
}
