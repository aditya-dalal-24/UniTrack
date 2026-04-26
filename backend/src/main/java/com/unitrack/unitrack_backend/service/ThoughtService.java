package com.unitrack.unitrack_backend.service;

import com.unitrack.unitrack_backend.dto.request.ThoughtRequest;
import com.unitrack.unitrack_backend.dto.response.ThoughtResponse;
import com.unitrack.unitrack_backend.entity.Thought;
import com.unitrack.unitrack_backend.repository.ThoughtRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@org.springframework.transaction.annotation.Transactional
public class ThoughtService {

    private final ThoughtRepository thoughtRepository;

    public void initDefaultThoughts() {
        if (thoughtRepository.count() == 0) {
            thoughtRepository.saveAll(List.of(
                Thought.builder().text("The secret of getting ahead is getting started.").author("Mark Twain").build(),
                Thought.builder().text("It does not matter how slowly you go as long as you do not stop.").author("Confucius").build(),
                Thought.builder().text("Believe you can and you're halfway there.").author("Theodore Roosevelt").build(),
                Thought.builder().text("Success is not final, failure is not fatal: it is the courage to continue that counts.").author("Winston Churchill").build(),
                Thought.builder().text("The only way to do great work is to love what you do.").author("Steve Jobs").build(),
                Thought.builder().text("Don't watch the clock; do what it does. Keep going.").author("Sam Levenson").build(),
                Thought.builder().text("Everything you’ve ever wanted is on the other side of fear.").author("George Addair").build()
            ));
        }
    }

    public ThoughtResponse getThoughtOfTheDay() {
        List<Thought> thoughts = thoughtRepository.findAll();
        if (thoughts.isEmpty()) {
            initDefaultThoughts();
            thoughts = thoughtRepository.findAll();
        }
        
        if (thoughts.isEmpty()) {
            return new ThoughtResponse(null, "Take a gentle moment to mark your attendance for today. Your progress matters!", "UniTrack", null);
        }
        
        long days = LocalDate.now().toEpochDay();
        int index = (int) (Math.abs(days) % thoughts.size());
        Thought thought = thoughts.get(index);
        return mapToResponse(thought);
    }

    public List<ThoughtResponse> getAllThoughts() {
        List<Thought> thoughts = thoughtRepository.findAll();
        if (thoughts.isEmpty()) {
            initDefaultThoughts();
            thoughts = thoughtRepository.findAll();
        }
        return thoughts.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public ThoughtResponse addThought(ThoughtRequest request) {
        Thought thought = Thought.builder()
                .text(request.getText())
                .author(request.getAuthor())
                .build();
        Thought saved = thoughtRepository.save(thought);
        return mapToResponse(saved);
    }

    public void deleteThought(Long id) {
        thoughtRepository.deleteById(id);
    }

    private ThoughtResponse mapToResponse(Thought thought) {
        return new ThoughtResponse(
                thought.getId(),
                thought.getText(),
                thought.getAuthor(),
                thought.getCreatedAt()
        );
    }
}
