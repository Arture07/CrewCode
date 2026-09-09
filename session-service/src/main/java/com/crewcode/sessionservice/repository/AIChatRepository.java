package com.crewcode.sessionservice.repository;

import com.crewcode.sessionservice.model.AIChat;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AIChatRepository extends JpaRepository<AIChat, Long> {

    List<AIChat> findBySessionIdOrderByUpdatedAtDesc(String sessionId, Pageable pageable);

    List<AIChat> findBySessionIdOrderByUpdatedAtDesc(String sessionId);

    List<AIChat> findByUsernameOrderByUpdatedAtDesc(String username, Pageable pageable);

    Optional<AIChat> findFirstByChatIdAndSessionId(String chatId, String sessionId);

    Optional<AIChat> findFirstByChatId(String chatId);

    void deleteByChatIdAndSessionId(String chatId, String sessionId);

    void deleteByChatId(String chatId);

    long countBySessionId(String sessionId);
}
