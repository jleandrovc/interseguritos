package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"interseguritos/routes-api/internal/graph"
	"interseguritos/routes-api/internal/routing"
)

type routeRequest struct {
	AccidentLocation string      `json:"accidentLocation"`
	Depots           []string    `json:"depots"`
	Graph            graph.Graph `json:"graph,omitempty"`
}

type routeResponse struct {
	FromDepot string   `json:"fromDepot"`
	To        string   `json:"to"`
	Path      []string `json:"path"`
	Distance  float64  `json:"distance"`
}

var statusByKind = map[graph.Kind]int{
	graph.KindInvalidRequest: http.StatusBadRequest,
	graph.KindInvalidGraph:   http.StatusBadRequest,
	graph.KindUnknownNode:    http.StatusBadRequest,
	graph.KindUnreachable:    http.StatusUnprocessableEntity,
}

type routesHandler struct {
	service      *routing.Service
	maxBodyBytes int64
}

func (h *routesHandler) optimalRoute(w http.ResponseWriter, r *http.Request) {
	var req routeRequest
	if err := decodeStrict(http.MaxBytesReader(w, r.Body, h.maxBodyBytes), &req); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeError(w, http.StatusRequestEntityTooLarge, "PAYLOAD_TOO_LARGE", "request body is too large", nil)
			return
		}
		writeError(w, http.StatusBadRequest, "INVALID_PAYLOAD", err.Error(), nil)
		return
	}

	route, err := h.service.OptimalRoute(routing.Request{
		AccidentLocation: req.AccidentLocation,
		Depots:           req.Depots,
		Graph:            req.Graph,
	})
	if err != nil {
		var domainErr *graph.Error
		if errors.As(err, &domainErr) {
			writeError(w, statusByKind[domainErr.Kind], string(domainErr.Kind), domainErr.Message, domainErr.Details)
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "unexpected error", nil)
		return
	}

	writeJSON(w, http.StatusOK, routeResponse{
		FromDepot: route.From,
		To:        route.To,
		Path:      route.Path,
		Distance:  route.Distance,
	})
}

func decodeStrict(body io.Reader, target any) error {
	decoder := json.NewDecoder(body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	if decoder.More() {
		return errors.New("body must contain a single JSON object")
	}
	return nil
}
