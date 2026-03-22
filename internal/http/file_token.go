package http

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// FileTokenTTL is the default TTL for signed file tokens.
const FileTokenTTL = 1 * time.Hour

// SignFileToken creates a short-lived HMAC token for file access.
// Token format: {base64url_hmac_16bytes}.{unix_expiry} (~40 chars).
// The path is bound into the signature so tokens can't be reused for other files.
func SignFileToken(path, secret string, ttl time.Duration) string {
	expiry := time.Now().Add(ttl).Unix()
	sig := fileTokenHMAC(path, secret, expiry)
	return fmt.Sprintf("%s.%d", sig, expiry)
}

// VerifyFileToken validates a signed file token against a path and secret.
// Returns true if the HMAC matches and the token has not expired.
func VerifyFileToken(token, path, secret string) bool {
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return false
	}
	expiry, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil || time.Now().Unix() > expiry {
		return false
	}
	expected := fileTokenHMAC(path, secret, expiry)
	return hmac.Equal([]byte(parts[0]), []byte(expected))
}

// fileTokenHMAC computes the HMAC signature component.
func fileTokenHMAC(path, secret string, expiry int64) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(fmt.Sprintf("%s:%d", path, expiry)))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil)[:16])
}

// fileURLRe matches /v1/files/... and /v1/media/... URLs in markdown and plain text.
// Captures the full URL path (stops at whitespace, closing paren, quote, or angle bracket).
var fileURLRe = regexp.MustCompile(`(/v1/(?:files|media)/[^\s)"'<>]+)`)

// SignFileURLs finds all /v1/files/ and /v1/media/ URLs in content and appends
// a signed ?ft= token. Used at delivery time (WS events, HTTP responses) to avoid
// persisting tokens in session messages. Skips URLs that already have ?ft=.
func SignFileURLs(content, secret string) string {
	if secret == "" || !strings.Contains(content, "/v1/") {
		return content
	}
	return fileURLRe.ReplaceAllStringFunc(content, func(url string) string {
		if strings.Contains(url, "ft=") {
			return url // already signed
		}
		ft := SignFileToken(url, secret, FileTokenTTL)
		sep := "?"
		if strings.Contains(url, "?") {
			sep = "&"
		}
		return url + sep + "ft=" + ft
	})
}
