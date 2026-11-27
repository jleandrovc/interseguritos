package httpapi

import (
	"encoding/json"
	"net/http"
)

type errorBody struct {
	StatusCode int            `json:"statusCode"`
	Error      string         `json:"error"`
	Code       string         `json:"code"`
	Message    string         `json:"message"`
	Details    map[string]any `json:"details,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, code, message string, details map[string]any) {
	writeJSON(w, status, errorBody{
		StatusCode: status,
		Error:      http.StatusText(status),
		Code:       code,
		Message:    message,
		Details:    details,
	})
}
