package pg

import (
	"context"
	"time"
)

func (s *PGSessionStore) AccumulateTokens(_ context.Context, key string, input, output int64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if data, ok := s.cache[key]; ok {
		data.InputTokens += input
		data.OutputTokens += output
	}
}

func (s *PGSessionStore) IncrementCompaction(_ context.Context, key string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if data, ok := s.cache[key]; ok {
		data.CompactionCount++
	}
}

func (s *PGSessionStore) GetCompactionCount(_ context.Context, key string) int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if data, ok := s.cache[key]; ok {
		return data.CompactionCount
	}
	return 0
}

func (s *PGSessionStore) GetMemoryFlushCompactionCount(_ context.Context, key string) int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if data, ok := s.cache[key]; ok {
		return data.MemoryFlushCompactionCount
	}
	return -1
}

func (s *PGSessionStore) SetMemoryFlushDone(_ context.Context, key string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if data, ok := s.cache[key]; ok {
		data.MemoryFlushCompactionCount = data.CompactionCount
		data.MemoryFlushAt = time.Now().UnixMilli()
	}
}

func (s *PGSessionStore) SetSpawnInfo(_ context.Context, key, spawnedBy string, depth int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if data, ok := s.cache[key]; ok {
		data.SpawnedBy = spawnedBy
		data.SpawnDepth = depth
	}
}

func (s *PGSessionStore) SetContextWindow(_ context.Context, key string, cw int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if data, ok := s.cache[key]; ok {
		data.ContextWindow = cw
	}
}

func (s *PGSessionStore) GetContextWindow(_ context.Context, key string) int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if data, ok := s.cache[key]; ok {
		return data.ContextWindow
	}
	return 0
}

func (s *PGSessionStore) SetLastPromptTokens(_ context.Context, key string, tokens, msgCount int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if data, ok := s.cache[key]; ok {
		data.LastPromptTokens = tokens
		data.LastMessageCount = msgCount
	}
}

func (s *PGSessionStore) GetLastPromptTokens(_ context.Context, key string) (int, int) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if data, ok := s.cache[key]; ok {
		return data.LastPromptTokens, data.LastMessageCount
	}
	return 0, 0
}
