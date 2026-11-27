package httpapi

import (
	"log/slog"
	"net/http"
	"slices"
	"strings"
	"time"

	"interseguritos/routes-api/internal/auth"
)

func requireScope(verifier *auth.Verifier, scope string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok || strings.TrimSpace(raw) == "" {
			writeError(w, http.StatusUnauthorized, "MISSING_TOKEN", "a Bearer token is required", nil)
			return
		}
		claims, err := verifier.Verify(strings.TrimSpace(raw))
		if err != nil {
			writeError(w, http.StatusUnauthorized, "INVALID_TOKEN", "the token is invalid or expired", nil)
			return
		}
		if !claims.HasScope(scope) {
			writeError(w, http.StatusForbidden, "INSUFFICIENT_SCOPE", "the token lacks the required scope",
				map[string]any{"requiredScope": scope})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func cors(allowed []string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && slices.Contains(allowed, origin) {
			h := w.Header()
			h.Set("Access-Control-Allow-Origin", origin)
			h.Set("Vary", "Origin")
			h.Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			h.Set("Access-Control-Max-Age", "600")
		}
		if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

func logRequests(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		logger.Info("request", "method", r.Method, "path", r.URL.Path, "status", rec.status,
			"durationMs", time.Since(start).Milliseconds())
	})
}

func recoverPanics(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				logger.Error("panic", "error", recovered, "path", r.URL.Path)
				writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "unexpected error", nil)
			}
		}()
		next.ServeHTTP(w, r)
	})
}
