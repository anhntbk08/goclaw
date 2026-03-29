package http

import (
	"archive/tar"
	"bufio"
	"bytes"
	"compress/gzip"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
)

// readImportArchive extracts the archive into an importArchive struct.
func readImportArchive(r io.Reader) (*importArchive, error) {
	gr, err := gzip.NewReader(r)
	if err != nil {
		return nil, fmt.Errorf("gzip open: %w", err)
	}
	defer gr.Close()

	tr := tar.NewReader(gr)
	entries := make(map[string][]byte)
	for {
		hdr, err := tr.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("tar read: %w", err)
		}
		data, err := io.ReadAll(io.LimitReader(tr, maxImportBodySize))
		if err != nil {
			return nil, fmt.Errorf("read entry %s: %w", hdr.Name, err)
		}
		entries[hdr.Name] = data
	}

	arc := &importArchive{
		memoryUsers: make(map[string][]MemoryExport),
	}

	if raw, ok := entries["manifest.json"]; ok {
		var m ExportManifest
		if err := json.Unmarshal(raw, &m); err != nil {
			return nil, fmt.Errorf("parse manifest: %w", err)
		}
		arc.manifest = &m
	}

	if raw, ok := entries["agent.json"]; ok {
		var cfg map[string]json.RawMessage
		if err := json.Unmarshal(raw, &cfg); err != nil {
			return nil, fmt.Errorf("parse agent.json: %w", err)
		}
		arc.agentConfig = cfg
	}

	for name, data := range entries {
		switch {
		case strings.HasPrefix(name, "context_files/"):
			fileName := strings.TrimPrefix(name, "context_files/")
			if fileName != "" {
				arc.contextFiles = append(arc.contextFiles, importContextFile{
					fileName: fileName,
					content:  string(data),
				})
			}
		case strings.HasPrefix(name, "user_context_files/"):
			rest := strings.TrimPrefix(name, "user_context_files/")
			parts := strings.SplitN(rest, "/", 2)
			if len(parts) == 2 && parts[0] != "" && parts[1] != "" {
				arc.userContextFiles = append(arc.userContextFiles, importUserContextFile{
					userID:   parts[0],
					fileName: parts[1],
					content:  string(data),
				})
			}
		case name == "memory/global.jsonl":
			docs, err := parseJSONL[MemoryExport](data)
			if err != nil {
				return nil, fmt.Errorf("parse memory/global.jsonl: %w", err)
			}
			arc.memoryGlobal = docs
		case strings.HasPrefix(name, "memory/users/") && strings.HasSuffix(name, ".jsonl"):
			uid := strings.TrimSuffix(strings.TrimPrefix(name, "memory/users/"), ".jsonl")
			docs, err := parseJSONL[MemoryExport](data)
			if err != nil {
				return nil, fmt.Errorf("parse memory/users/%s.jsonl: %w", uid, err)
			}
			arc.memoryUsers[uid] = docs
		case name == "knowledge_graph/entities.jsonl":
			entities, err := parseJSONL[KGEntityExport](data)
			if err != nil {
				return nil, fmt.Errorf("parse kg entities: %w", err)
			}
			arc.kgEntities = entities
		case name == "knowledge_graph/relations.jsonl":
			relations, err := parseJSONL[KGRelationExport](data)
			if err != nil {
				return nil, fmt.Errorf("parse kg relations: %w", err)
			}
			arc.kgRelations = relations
		}
	}

	return arc, nil
}

// parseJSONL decodes newline-delimited JSON into a slice of T.
func parseJSONL[T any](data []byte) ([]T, error) {
	var result []T
	scanner := bufio.NewScanner(bytes.NewReader(data))
	scanner.Buffer(make([]byte, 1<<20), 10<<20)
	for scanner.Scan() {
		line := bytes.TrimSpace(scanner.Bytes())
		if len(line) == 0 {
			continue
		}
		var item T
		if err := json.Unmarshal(line, &item); err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, scanner.Err()
}

// countUserMemory returns the total number of per-user memory docs.
func countUserMemory(m map[string][]MemoryExport) int {
	n := 0
	for _, docs := range m {
		n += len(docs)
	}
	return n
}

// unmarshalField decodes a JSON raw value into dest if present.
func unmarshalField[T any](cfg map[string]json.RawMessage, key string, dest *T) {
	if raw, ok := cfg[key]; ok && len(raw) > 0 {
		json.Unmarshal(raw, dest) //nolint:errcheck
	}
}

// rawOrNil returns the raw message if non-empty, else nil.
func rawOrNil(raw json.RawMessage) json.RawMessage {
	if len(raw) == 0 {
		return nil
	}
	return raw
}
