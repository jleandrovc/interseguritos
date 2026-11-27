package graph

import (
	"errors"
	"fmt"
	"math"
	"slices"
	"testing"
)

func pdfGraph() Graph {
	return Graph{
		"Miraflores": {"San Isidro": 7, "Barranco": 3},
		"San Isidro": {"Miraflores": 7, "Lince": 4},
		"Barranco":   {"Miraflores": 3, "Surco": 5},
		"Lince":      {"San Isidro": 4, "Surco": 6},
		"Surco":      {"Barranco": 5, "Lince": 6, "Ate": 10},
		"Ate":        {"Surco": 10},
	}
}

func mustCompile(t testing.TB, g Graph) *Network {
	t.Helper()
	network, err := Compile(g, DefaultLimits)
	if err != nil {
		t.Fatalf("compile: %v", err)
	}
	return network
}

func TestNearestSourceRoute(t *testing.T) {
	tests := []struct {
		name     string
		graph    Graph
		depots   []string
		target   string
		wantFrom string
		wantPath []string
		wantDist float64
	}{
		{
			name: "PDF example picks Miraflores over Ate", graph: pdfGraph(),
			depots: []string{"Miraflores", "Ate"}, target: "San Isidro",
			wantFrom: "Miraflores", wantPath: []string{"Miraflores", "San Isidro"}, wantDist: 7,
		},
		{
			name: "multi-hop path through intermediate districts", graph: pdfGraph(),
			depots: []string{"Ate"}, target: "San Isidro",
			wantFrom: "Ate", wantPath: []string{"Ate", "Surco", "Lince", "San Isidro"}, wantDist: 20,
		},
		{
			name:   "indirect route shorter than the direct edge",
			graph:  Graph{"A": {"C": 10, "B": 2}, "B": {"C": 3}},
			depots: []string{"A"}, target: "C",
			wantFrom: "A", wantPath: []string{"A", "B", "C"}, wantDist: 5,
		},
		{
			name: "accident located at a depot has distance zero", graph: pdfGraph(),
			depots: []string{"Ate", "Lince"}, target: "Lince",
			wantFrom: "Lince", wantPath: []string{"Lince"}, wantDist: 0,
		},
		{
			name:   "tie is broken by depot order in the request",
			graph:  Graph{"North": {"Center": 5}, "South": {"Center": 5}},
			depots: []string{"South", "North"}, target: "Center",
			wantFrom: "South", wantPath: []string{"South", "Center"}, wantDist: 5,
		},
		{
			name:   "node declared only as neighbor is a valid target",
			graph:  Graph{"Depot": {"Callao": 12}},
			depots: []string{"Depot"}, target: "Callao",
			wantFrom: "Depot", wantPath: []string{"Depot", "Callao"}, wantDist: 12,
		},
		{
			name:   "duplicate depots are ignored",
			graph:  Graph{"A": {"B": 1}},
			depots: []string{"A", "A"}, target: "B",
			wantFrom: "A", wantPath: []string{"A", "B"}, wantDist: 1,
		},
		{
			name:   "decimal distances",
			graph:  Graph{"A": {"B": 1.5}, "B": {"C": 2.25}},
			depots: []string{"A"}, target: "C",
			wantFrom: "A", wantPath: []string{"A", "B", "C"}, wantDist: 3.75,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			route, err := mustCompile(t, tc.graph).NearestSourceRoute(tc.depots, tc.target)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if route.From != tc.wantFrom || route.To != tc.target || route.Distance != tc.wantDist || !slices.Equal(route.Path, tc.wantPath) {
				t.Fatalf("got %+v, want from=%s path=%v distance=%v", route, tc.wantFrom, tc.wantPath, tc.wantDist)
			}
		})
	}
}

func TestNearestSourceRouteErrors(t *testing.T) {
	directed := Graph{"Depot": {"A": 1}, "B": {"Depot": 1}}

	tests := []struct {
		name     string
		depots   []string
		target   string
		wantKind Kind
	}{
		{"edges are directed so B is unreachable", []string{"Depot"}, "B", KindUnreachable},
		{"unknown accident location", []string{"Depot"}, "Lurin", KindUnknownNode},
		{"unknown depot", []string{"Chorrillos"}, "A", KindUnknownNode},
		{"no depots", nil, "A", KindInvalidRequest},
	}

	network := mustCompile(t, directed)
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := network.NearestSourceRoute(tc.depots, tc.target)
			var domainErr *Error
			if !errors.As(err, &domainErr) || domainErr.Kind != tc.wantKind {
				t.Fatalf("got %v, want kind %s", err, tc.wantKind)
			}
		})
	}
}

func TestCompileRejectsInvalidGraphs(t *testing.T) {
	tests := map[string]Graph{
		"empty graph":       {},
		"negative distance": {"A": {"B": -1}},
		"infinite distance": {"A": {"B": math.Inf(1)}},
		"blank node name":   {" ": {"B": 1}},
		"blank neighbor":    {"A": {"": 1}},
	}
	for name, g := range tests {
		t.Run(name, func(t *testing.T) {
			_, err := Compile(g, DefaultLimits)
			var domainErr *Error
			if !errors.As(err, &domainErr) || domainErr.Kind != KindInvalidGraph {
				t.Fatalf("got %v, want INVALID_GRAPH", err)
			}
		})
	}
}

func TestCompileEnforcesLimits(t *testing.T) {
	_, err := Compile(Graph{"A": {"B": 1, "C": 1}}, Limits{MaxNodes: 2, MaxEdges: 10, MaxWeight: 100})
	var domainErr *Error
	if !errors.As(err, &domainErr) || domainErr.Kind != KindInvalidGraph {
		t.Fatalf("got %v, want INVALID_GRAPH for too many nodes", err)
	}
}

func TestNearestSourceRouteIsDeterministic(t *testing.T) {
	g := Graph{"S": {"A": 1, "B": 1}, "A": {"T": 1}, "B": {"T": 1}}
	first, _ := mustCompile(t, g).NearestSourceRoute([]string{"S"}, "T")
	for range 50 {
		route, _ := mustCompile(t, g).NearestSourceRoute([]string{"S"}, "T")
		if !slices.Equal(route.Path, first.Path) {
			t.Fatalf("non-deterministic path: %v vs %v", route.Path, first.Path)
		}
	}
}

// gridGraph builds a size x size bidirectional grid (size^2 nodes, ~4*size^2 edges).
func gridGraph(size int) Graph {
	g := make(Graph, size*size)
	name := func(r, c int) string { return fmt.Sprintf("n%d_%d", r, c) }
	for r := range size {
		for c := range size {
			neighbors := map[string]float64{}
			if r+1 < size {
				neighbors[name(r+1, c)] = float64(1 + (r+c)%7)
			}
			if c+1 < size {
				neighbors[name(r, c+1)] = float64(1 + (r*c)%5)
			}
			if r > 0 {
				neighbors[name(r-1, c)] = float64(1 + (r+c)%7)
			}
			if c > 0 {
				neighbors[name(r, c-1)] = float64(1 + (r*c)%5)
			}
			g[name(r, c)] = neighbors
		}
	}
	return g
}

func BenchmarkNearestSourceRoute10kNodes(b *testing.B) {
	network := mustCompile(b, gridGraph(100))
	depots := []string{"n0_0", "n0_99", "n99_0"}
	b.ResetTimer()
	for b.Loop() {
		if _, err := network.NearestSourceRoute(depots, "n99_99"); err != nil {
			b.Fatal(err)
		}
	}
}
