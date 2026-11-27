package httpapi

import (
	"log/slog"
	"net/http"

	"interseguritos/routes-api/internal/auth"
	"interseguritos/routes-api/internal/routing"
)

const ScopeRoutesCalculate = "routes:calculate"

type Dependencies struct {
	Service      *routing.Service
	Verifier     *auth.Verifier
	Logger       *slog.Logger
	CORSOrigins  []string
	MaxBodyBytes int64
}

func NewRouter(deps Dependencies) http.Handler {
	routes := &routesHandler{service: deps.Service, maxBodyBytes: deps.MaxBodyBytes}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "routes-api"})
	})
	mux.Handle("POST /api/v1/routes/optimal",
		requireScope(deps.Verifier, ScopeRoutesCalculate, http.HandlerFunc(routes.optimalRoute)))

	return recoverPanics(deps.Logger, logRequests(deps.Logger, cors(deps.CORSOrigins, mux)))
}
