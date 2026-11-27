package routing

import (
	"strings"

	"interseguritos/routes-api/internal/graph"
)

type Request struct {
	AccidentLocation string
	Depots           []string
	Graph            graph.Graph
}

// Service assigns the nearest tow depot. The road network is data, not code: it comes in the
// request or, when omitted, from the default network loaded at startup.
type Service struct {
	defaultNetwork *graph.Network
	limits         graph.Limits
}

func NewService(defaultNetwork *graph.Network, limits graph.Limits) *Service {
	return &Service{defaultNetwork: defaultNetwork, limits: limits}
}

func (s *Service) OptimalRoute(req Request) (graph.Route, error) {
	if strings.TrimSpace(req.AccidentLocation) == "" {
		return graph.Route{}, &graph.Error{Kind: graph.KindInvalidRequest, Message: "accidentLocation is required"}
	}

	network, err := s.network(req.Graph)
	if err != nil {
		return graph.Route{}, err
	}
	return network.NearestSourceRoute(req.Depots, req.AccidentLocation)
}

func (s *Service) network(g graph.Graph) (*graph.Network, error) {
	if g != nil {
		return graph.Compile(g, s.limits)
	}
	if s.defaultNetwork == nil {
		return nil, &graph.Error{Kind: graph.KindInvalidRequest, Message: "graph is required: no default network is configured"}
	}
	return s.defaultNetwork, nil
}
