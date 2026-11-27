package httpapi

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"interseguritos/routes-api/internal/auth"
	"interseguritos/routes-api/internal/graph"
	"interseguritos/routes-api/internal/routing"
)

var testJWT = auth.Config{
	Secret:   []byte(strings.Repeat("s", 48)),
	Issuer:   "interseguritos",
	Audience: "interseguritos-apis",
}

const pdfRequest = `{
  "accidentLocation": "San Isidro",
  "depots": ["Miraflores", "Ate"],
  "graph": {
    "Miraflores": { "San Isidro": 7, "Barranco": 3 },
    "San Isidro": { "Miraflores": 7, "Lince": 4 },
    "Barranco": { "Miraflores": 3, "Surco": 5 },
    "Lince": { "San Isidro": 4, "Surco": 6 },
    "Surco": { "Barranco": 5, "Lince": 6, "Ate": 10 },
    "Ate": { "Surco": 10 }
  }
}`

func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	server := httptest.NewServer(NewRouter(Dependencies{
		Service:      routing.NewService(nil, graph.DefaultLimits),
		Verifier:     auth.NewVerifier(testJWT),
		Logger:       slog.New(slog.NewTextHandler(io.Discard, nil)),
		CORSOrigins:  []string{"http://localhost:5173"},
		MaxBodyBytes: 4096,
	}))
	t.Cleanup(server.Close)
	return server
}

// signToken mimics the claims emitted by endorsement-api (@hapi/jwt).
func signToken(t *testing.T, mutate func(jwt.MapClaims), method jwt.SigningMethod, key any) string {
	t.Helper()
	now := time.Now()
	claims := jwt.MapClaims{
		"aud": testJWT.Audience, "iss": testJWT.Issuer, "sub": "frontend",
		"scope": []string{"endorse:translate", ScopeRoutesCalculate},
		"iat":   now.Unix(), "exp": now.Add(time.Hour).Unix(),
	}
	if mutate != nil {
		mutate(claims)
	}
	token, err := jwt.NewWithClaims(method, claims).SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	return token
}

func validToken(t *testing.T) string {
	return signToken(t, nil, jwt.SigningMethodHS256, testJWT.Secret)
}

func post(t *testing.T, server *httptest.Server, body, token string) (*http.Response, map[string]any) {
	t.Helper()
	req, _ := http.NewRequest(http.MethodPost, server.URL+"/api/v1/routes/optimal", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var payload map[string]any
	_ = json.NewDecoder(res.Body).Decode(&payload)
	return res, payload
}

func TestOptimalRouteReturnsPDFExpectedOutput(t *testing.T) {
	res, body := post(t, newTestServer(t), pdfRequest, validToken(t))
	if res.StatusCode != http.StatusOK {
		t.Fatalf("status %d: %v", res.StatusCode, body)
	}
	got, _ := json.Marshal(body)
	want := `{"distance":7,"fromDepot":"Miraflores","path":["Miraflores","San Isidro"],"to":"San Isidro"}`
	if string(got) != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}

func TestOptimalRouteErrors(t *testing.T) {
	server := newTestServer(t)
	token := validToken(t)

	tests := []struct {
		name       string
		body       string
		token      string
		wantStatus int
		wantCode   string
	}{
		{"missing token", pdfRequest, "", 401, "MISSING_TOKEN"},
		{"token signed with another secret", pdfRequest,
			signToken(t, nil, jwt.SigningMethodHS256, []byte(strings.Repeat("x", 48))), 401, "INVALID_TOKEN"},
		{"expired token", pdfRequest,
			signToken(t, func(c jwt.MapClaims) { c["exp"] = time.Now().Add(-time.Hour).Unix() }, jwt.SigningMethodHS256, testJWT.Secret), 401, "INVALID_TOKEN"},
		{"wrong audience", pdfRequest,
			signToken(t, func(c jwt.MapClaims) { c["aud"] = "other" }, jwt.SigningMethodHS256, testJWT.Secret), 401, "INVALID_TOKEN"},
		{"alg none is rejected", pdfRequest,
			signToken(t, nil, jwt.SigningMethodNone, jwt.UnsafeAllowNoneSignatureType), 401, "INVALID_TOKEN"},
		{"missing scope", pdfRequest,
			signToken(t, func(c jwt.MapClaims) { c["scope"] = []string{"endorse:translate"} }, jwt.SigningMethodHS256, testJWT.Secret), 403, "INSUFFICIENT_SCOPE"},
		{"malformed JSON", `{"accidentLocation":`, token, 400, "INVALID_PAYLOAD"},
		{"unknown field", `{"accidentLocation":"A","depots":["A"],"graph":{"A":{}},"extra":1}`, token, 400, "INVALID_PAYLOAD"},
		{"distance is not a number", `{"accidentLocation":"B","depots":["A"],"graph":{"A":{"B":"7"}}}`, token, 400, "INVALID_PAYLOAD"},
		{"negative distance", `{"accidentLocation":"B","depots":["A"],"graph":{"A":{"B":-7}}}`, token, 400, "INVALID_GRAPH"},
		{"unknown depot", `{"accidentLocation":"B","depots":["Z"],"graph":{"A":{"B":7}}}`, token, 400, "UNKNOWN_NODE"},
		{"graph required without default", `{"accidentLocation":"B","depots":["A"]}`, token, 400, "INVALID_REQUEST"},
		{"unreachable accident", `{"accidentLocation":"A","depots":["B"],"graph":{"A":{"B":7}}}`, token, 422, "ROUTE_UNREACHABLE"},
		{"payload too large", `{"accidentLocation":"` + strings.Repeat("a", 5000) + `"}`, token, 413, "PAYLOAD_TOO_LARGE"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			res, body := post(t, server, tc.body, tc.token)
			if res.StatusCode != tc.wantStatus || body["code"] != tc.wantCode {
				t.Fatalf("got %d %v, want %d %s", res.StatusCode, body, tc.wantStatus, tc.wantCode)
			}
		})
	}
}

func TestHealthAndCORS(t *testing.T) {
	server := newTestServer(t)

	res, err := http.Get(server.URL + "/health")
	if err != nil || res.StatusCode != http.StatusOK {
		t.Fatalf("health: %v %v", res, err)
	}

	req, _ := http.NewRequest(http.MethodOptions, server.URL+"/api/v1/routes/optimal", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	req.Header.Set("Access-Control-Request-Method", "POST")
	res, err = http.DefaultClient.Do(req)
	if err != nil || res.StatusCode != http.StatusNoContent || res.Header.Get("Access-Control-Allow-Origin") != "http://localhost:5173" {
		t.Fatalf("preflight: %v %v", res, err)
	}

	req.Header.Set("Origin", "http://evil.example")
	res, _ = http.DefaultClient.Do(req)
	if res.Header.Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("unexpected CORS header for disallowed origin")
	}
}
