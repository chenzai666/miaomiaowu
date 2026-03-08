package handler

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"miaomiaowu/internal/auth"
	"miaomiaowu/internal/storage"
)

type shortLinkHandler struct {
	repo                *storage.TrafficRepository
	subscriptionHandler *SubscriptionHandler
}

// NewShortLinkHandler creates a handler for short link redirection.
func NewShortLinkHandler(repo *storage.TrafficRepository, subscriptionHandler *SubscriptionHandler) *shortLinkHandler {
	if repo == nil {
		panic("short link handler requires repository")
	}
	if subscriptionHandler == nil {
		panic("short link handler requires subscription handler")
	}

	return &shortLinkHandler{
		repo:                repo,
		subscriptionHandler: subscriptionHandler,
	}
}

// TryServe attempts to serve the request as a short link.
// Returns true if the request was handled, false if not matched (caller should fall through).
func (h *shortLinkHandler) TryServe(w http.ResponseWriter, r *http.Request) bool {
	if r.Method != http.MethodGet {
		return false
	}

	compositeCode := strings.Trim(r.URL.Path, "/")
	if len(compositeCode) < 2 {
		return false
	}

	ctx := r.Context()

	fileCodes, err := h.repo.GetAllFileShortCodes(ctx)
	if err != nil || len(fileCodes) == 0 {
		return false
	}
	userCodes, err := h.repo.GetAllUserShortCodes(ctx)
	if err != nil || len(userCodes) == 0 {
		return false
	}

	// 因为自定义短链接没有分隔符, 此处使用模糊匹配
	// TODO: 如果用户体验不佳改为缓存加hash匹配
	var filename, username string
	matched := false
	for i := len(compositeCode) - 1; i >= 1; i-- {
		fileCode := compositeCode[:i]
		userCode := compositeCode[i:]
		fn, fOk := fileCodes[fileCode]
		un, uOk := userCodes[userCode]
		if fOk && uOk {
			filename = fn
			username = un
			matched = true
			break
		}
	}

	if !matched {
		return false
	}

	// 使用真实文件与用户token转发订阅请求
	newURL := *r.URL
	q := newURL.Query()
	q.Set("filename", filename)
	if clientType := r.URL.Query().Get("t"); clientType != "" {
		q.Set("t", clientType)
	}
	newURL.RawQuery = q.Encode()

	newCtx := auth.ContextWithUsername(ctx, username)
	newRequest := r.Clone(newCtx)
	newRequest.URL = &newURL
	h.subscriptionHandler.ServeHTTP(w, newRequest)
	return true
}

// ServeHTTP implements http.Handler for backward compatibility.
func (h *shortLinkHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !h.TryServe(w, r) {
		http.NotFound(w, r)
	}
}

// NewShortLinkResetHandler creates a handler for resetting short links.
type shortLinkResetHandler struct {
	repo *storage.TrafficRepository
}

// NewShortLinkResetHandler creates a handler for resetting user short links.
func NewShortLinkResetHandler(repo *storage.TrafficRepository) http.Handler {
	if repo == nil {
		panic("short link reset handler requires repository")
	}

	return &shortLinkResetHandler{repo: repo}
}

func (h *shortLinkResetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Get username from context (authenticated via middleware)
	username := auth.UsernameFromContext(r.Context())
	if username == "" {
		writeError(w, http.StatusUnauthorized, errors.New("unauthorized"))
		return
	}

	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, errors.New("only POST is supported"))
		return
	}

	h.handleReset(w, r, username)
}

func (h *shortLinkResetHandler) handleReset(w http.ResponseWriter, r *http.Request, username string) {
	// Reset short URLs for all subscriptions
	if err := h.repo.ResetAllSubscriptionShortURLs(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	// Return success
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"message":"所有订阅的短链接已重置"}`)
}
