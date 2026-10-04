package repository

import "context"

type offlineReplayKey struct{}

// WithOfflineReplay marks a chronologically sorted sync replay. Online endpoints
// never receive this marker and retain strict live-current-stop validation.
func WithOfflineReplay(ctx context.Context) context.Context {
	return context.WithValue(ctx, offlineReplayKey{}, true)
}
func isOfflineReplay(ctx context.Context) bool {
	v, _ := ctx.Value(offlineReplayKey{}).(bool)
	return v
}
