package graph

import (
	"math"
	"sort"
	"strings"
)

// Graph is the input representation: node -> neighbor -> distance.
// Edges are directed; an undirected road must be declared in both directions.
type Graph map[string]map[string]float64

type Limits struct {
	MaxNodes  int
	MaxEdges  int
	MaxWeight float64
}

var DefaultLimits = Limits{MaxNodes: 10_000, MaxEdges: 100_000, MaxWeight: 1e9}

type edge struct {
	to     int
	weight float64
}

// Network is an immutable, index-based compilation of a Graph.
// Nodes and edges are sorted by name so results are deterministic regardless of map iteration order.
type Network struct {
	names []string
	index map[string]int
	adj   [][]edge
}

func Compile(g Graph, limits Limits) (*Network, error) {
	if len(g) == 0 {
		return nil, newError(KindInvalidGraph, nil, "graph must contain at least one node")
	}

	nameSet := make(map[string]struct{}, len(g))
	edges := 0
	for from, neighbors := range g {
		if err := validateName(from); err != nil {
			return nil, err
		}
		nameSet[from] = struct{}{}
		for to, weight := range neighbors {
			if err := validateName(to); err != nil {
				return nil, err
			}
			if math.IsNaN(weight) || math.IsInf(weight, 0) || weight < 0 || weight > limits.MaxWeight {
				return nil, newError(KindInvalidGraph,
					map[string]any{"from": from, "to": to, "weight": weight},
					"distance from %q to %q must be between 0 and %g", from, to, limits.MaxWeight)
			}
			nameSet[to] = struct{}{}
			edges++
		}
	}
	if len(nameSet) > limits.MaxNodes || edges > limits.MaxEdges {
		return nil, newError(KindInvalidGraph,
			map[string]any{"nodes": len(nameSet), "edges": edges, "maxNodes": limits.MaxNodes, "maxEdges": limits.MaxEdges},
			"graph exceeds the allowed size")
	}

	names := make([]string, 0, len(nameSet))
	for name := range nameSet {
		names = append(names, name)
	}
	sort.Strings(names)

	index := make(map[string]int, len(names))
	for i, name := range names {
		index[name] = i
	}

	adj := make([][]edge, len(names))
	for from, neighbors := range g {
		list := make([]edge, 0, len(neighbors))
		for to, weight := range neighbors {
			list = append(list, edge{to: index[to], weight: weight})
		}
		sort.Slice(list, func(i, j int) bool { return list[i].to < list[j].to })
		adj[index[from]] = list
	}

	return &Network{names: names, index: index, adj: adj}, nil
}

func (n *Network) Nodes() []string { return append([]string(nil), n.names...) }

func (n *Network) Has(name string) bool {
	_, ok := n.index[name]
	return ok
}

func validateName(name string) error {
	if strings.TrimSpace(name) == "" {
		return newError(KindInvalidGraph, nil, "node names must not be empty")
	}
	return nil
}
