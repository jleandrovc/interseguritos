package auth

import (
	"errors"
	"slices"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Config struct {
	Secret   []byte
	Issuer   string
	Audience string
}

type Claims struct {
	Scope []string `json:"scope"`
	jwt.RegisteredClaims
}

func (c *Claims) HasScope(scope string) bool { return slices.Contains(c.Scope, scope) }

// Verifier validates HS256 tokens issued by endorsement-api (/api/v1/auth/token).
type Verifier struct {
	secret []byte
	parser *jwt.Parser
}

func NewVerifier(cfg Config) *Verifier {
	return &Verifier{
		secret: cfg.Secret,
		parser: jwt.NewParser(
			jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
			jwt.WithIssuer(cfg.Issuer),
			jwt.WithAudience(cfg.Audience),
			jwt.WithExpirationRequired(),
			jwt.WithIssuedAt(),
			jwt.WithLeeway(15*time.Second),
		),
	}
}

var ErrInvalidToken = errors.New("invalid token")

func (v *Verifier) Verify(raw string) (*Claims, error) {
	claims := &Claims{}
	_, err := v.parser.ParseWithClaims(raw, claims, func(*jwt.Token) (any, error) { return v.secret, nil })
	if err != nil {
		return nil, errors.Join(ErrInvalidToken, err)
	}
	return claims, nil
}
