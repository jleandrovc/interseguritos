package config

import (
	"slices"
	"strings"
	"testing"
)

func env(values map[string]string) func(string) string {
	return func(key string) string { return values[key] }
}

func TestLoadAppliesDefaults(t *testing.T) {
	cfg, err := Load(env(map[string]string{"JWT_SECRET": strings.Repeat("k", 32)}))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Port != "8080" || cfg.JWT.Issuer != "interseguritos" || cfg.JWT.Audience != "interseguritos-apis" {
		t.Fatalf("unexpected defaults: %+v", cfg)
	}
	if !slices.Equal(cfg.CORSOrigins, []string{"http://localhost:5173"}) || cfg.MaxBodyBytes != 1<<20 {
		t.Fatalf("unexpected defaults: %+v", cfg)
	}
}

func TestLoadParsesOverrides(t *testing.T) {
	cfg, err := Load(env(map[string]string{
		"JWT_SECRET":      strings.Repeat("k", 40),
		"PORT":            "9090",
		"CORS_ORIGINS":    "https://a.example, https://b.example",
		"MAX_GRAPH_NODES": "50",
	}))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Port != "9090" || cfg.Limits.MaxNodes != 50 || len(cfg.CORSOrigins) != 2 {
		t.Fatalf("overrides not applied: %+v", cfg)
	}
}

func TestLoadRejectsInvalidValues(t *testing.T) {
	_, err := Load(env(map[string]string{"JWT_SECRET": "short", "MAX_BODY_BYTES": "-1"}))
	if err == nil || !strings.Contains(err.Error(), "JWT_SECRET") || !strings.Contains(err.Error(), "MAX_BODY_BYTES") {
		t.Fatalf("expected aggregated validation error, got %v", err)
	}
}
