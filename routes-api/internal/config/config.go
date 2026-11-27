package config

import (
	"errors"
	"fmt"
	"strconv"
	"strings"

	"interseguritos/routes-api/internal/auth"
	"interseguritos/routes-api/internal/graph"
)

type Config struct {
	Port             string
	JWT              auth.Config
	CORSOrigins      []string
	DefaultGraphFile string
	MaxBodyBytes     int64
	Limits           graph.Limits
}

func Load(getenv func(string) string) (Config, error) {
	get := func(key, fallback string) string {
		if value := strings.TrimSpace(getenv(key)); value != "" {
			return value
		}
		return fallback
	}

	var errs []error
	secret := getenv("JWT_SECRET")
	if len(secret) < 32 {
		errs = append(errs, errors.New("JWT_SECRET must be at least 32 characters"))
	}
	maxBody, err := strconv.ParseInt(get("MAX_BODY_BYTES", "1048576"), 10, 64)
	if err != nil || maxBody <= 0 {
		errs = append(errs, errors.New("MAX_BODY_BYTES must be a positive integer"))
	}
	maxNodes, err := strconv.Atoi(get("MAX_GRAPH_NODES", strconv.Itoa(graph.DefaultLimits.MaxNodes)))
	if err != nil || maxNodes <= 0 {
		errs = append(errs, errors.New("MAX_GRAPH_NODES must be a positive integer"))
	}
	maxEdges, err := strconv.Atoi(get("MAX_GRAPH_EDGES", strconv.Itoa(graph.DefaultLimits.MaxEdges)))
	if err != nil || maxEdges <= 0 {
		errs = append(errs, errors.New("MAX_GRAPH_EDGES must be a positive integer"))
	}
	if len(errs) > 0 {
		return Config{}, fmt.Errorf("invalid configuration: %w", errors.Join(errs...))
	}

	var origins []string
	for _, origin := range strings.Split(get("CORS_ORIGINS", "http://localhost:5173"), ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			origins = append(origins, origin)
		}
	}

	return Config{
		Port: get("PORT", "8080"),
		JWT: auth.Config{
			Secret:   []byte(secret),
			Issuer:   get("JWT_ISSUER", "interseguritos"),
			Audience: get("JWT_AUDIENCE", "interseguritos-apis"),
		},
		CORSOrigins:      origins,
		DefaultGraphFile: get("DEFAULT_GRAPH_FILE", ""),
		MaxBodyBytes:     maxBody,
		Limits:           graph.Limits{MaxNodes: maxNodes, MaxEdges: maxEdges, MaxWeight: graph.DefaultLimits.MaxWeight},
	}, nil
}
