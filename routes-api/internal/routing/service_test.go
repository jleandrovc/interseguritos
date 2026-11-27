package routing

import (
	"errors"
	"testing"

	"interseguritos/routes-api/internal/graph"
)

func TestOptimalRouteUsesRequestGraph(t *testing.T) {
	service := NewService(nil, graph.DefaultLimits)
	route, err := service.OptimalRoute(Request{
		AccidentLocation: "B",
		Depots:           []string{"A"},
		Graph:            graph.Graph{"A": {"B": 4}},
	})
	if err != nil || route.Distance != 4 {
		t.Fatalf("got %+v, %v", route, err)
	}
}

func TestOptimalRouteFallsBackToDefaultNetwork(t *testing.T) {
	network, err := graph.LoadFile("../../data/lima-sample.json", graph.DefaultLimits)
	if err != nil {
		t.Fatal(err)
	}
	route, err := NewService(network, graph.DefaultLimits).OptimalRoute(Request{
		AccidentLocation: "San Isidro",
		Depots:           []string{"Miraflores", "Ate"},
	})
	if err != nil || route.From != "Miraflores" || route.Distance != 7 {
		t.Fatalf("got %+v, %v", route, err)
	}
}

func TestOptimalRouteValidation(t *testing.T) {
	service := NewService(nil, graph.DefaultLimits)
	tests := map[string]Request{
		"missing accident location":      {Depots: []string{"A"}, Graph: graph.Graph{"A": {"B": 1}}},
		"missing graph without fallback": {AccidentLocation: "B", Depots: []string{"A"}},
	}
	for name, req := range tests {
		t.Run(name, func(t *testing.T) {
			_, err := service.OptimalRoute(req)
			var domainErr *graph.Error
			if !errors.As(err, &domainErr) || domainErr.Kind != graph.KindInvalidRequest {
				t.Fatalf("got %v, want INVALID_REQUEST", err)
			}
		})
	}
}
