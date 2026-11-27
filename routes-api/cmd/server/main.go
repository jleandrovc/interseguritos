package main

import (
	"context"
	"errors"
	"flag"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"interseguritos/routes-api/internal/auth"
	"interseguritos/routes-api/internal/config"
	"interseguritos/routes-api/internal/graph"
	"interseguritos/routes-api/internal/httpapi"
	"interseguritos/routes-api/internal/routing"
)

func main() {
	healthcheck := flag.Bool("healthcheck", false, "probe /health and exit (for distroless/scratch images)")
	flag.Parse()

	if *healthcheck {
		port := os.Getenv("PORT")
		if port == "" {
			port = "8080"
		}
		os.Exit(probe(port))
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	cfg, err := config.Load(os.Getenv)
	if err != nil {
		logger.Error("startup failed", "error", err)
		os.Exit(1)
	}

	var defaultNetwork *graph.Network
	if cfg.DefaultGraphFile != "" {
		if defaultNetwork, err = graph.LoadFile(cfg.DefaultGraphFile, cfg.Limits); err != nil {
			logger.Error("cannot load default graph", "file", cfg.DefaultGraphFile, "error", err)
			os.Exit(1)
		}
		logger.Info("default graph loaded", "file", cfg.DefaultGraphFile, "nodes", len(defaultNetwork.Nodes()))
	}

	handler := httpapi.NewRouter(httpapi.Dependencies{
		Service:      routing.NewService(defaultNetwork, cfg.Limits),
		Verifier:     auth.NewVerifier(cfg.JWT),
		Logger:       logger,
		CORSOrigins:  cfg.CORSOrigins,
		MaxBodyBytes: cfg.MaxBodyBytes,
	})

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		logger.Info("routes-api listening", "addr", server.Addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown failed", "error", err)
	}
}

func probe(port string) int {
	client := http.Client{Timeout: 2 * time.Second}
	res, err := client.Get("http://127.0.0.1:" + port + "/health")
	if err != nil {
		return 1
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return 1
	}
	return 0
}
