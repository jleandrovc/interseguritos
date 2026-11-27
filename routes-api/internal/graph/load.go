package graph

import (
	"encoding/json"
	"fmt"
	"os"
)

// LoadFile reads a Graph from a JSON file with the same shape as the API "graph" field.
func LoadFile(path string, limits Limits) (*Network, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read graph file: %w", err)
	}
	var g Graph
	if err := json.Unmarshal(raw, &g); err != nil {
		return nil, fmt.Errorf("decode graph file %s: %w", path, err)
	}
	return Compile(g, limits)
}
