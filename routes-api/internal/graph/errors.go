package graph

import "fmt"

// Kind classifies domain errors so transports can map them without string matching.
type Kind string

const (
	KindInvalidRequest Kind = "INVALID_REQUEST"
	KindInvalidGraph   Kind = "INVALID_GRAPH"
	KindUnknownNode    Kind = "UNKNOWN_NODE"
	KindUnreachable    Kind = "ROUTE_UNREACHABLE"
)

type Error struct {
	Kind    Kind
	Message string
	Details map[string]any
}

func (e *Error) Error() string { return e.Message }

func newError(kind Kind, details map[string]any, format string, args ...any) *Error {
	return &Error{Kind: kind, Message: fmt.Sprintf(format, args...), Details: details}
}
