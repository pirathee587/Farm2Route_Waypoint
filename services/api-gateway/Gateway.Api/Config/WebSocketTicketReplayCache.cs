using System.Collections.Concurrent;

namespace Gateway.Api.Config;

public sealed class WebSocketTicketReplayCache(TimeProvider timeProvider)
{
    private readonly ConcurrentDictionary<string, long> _consumed = new(StringComparer.Ordinal);

    public int Count => _consumed.Count;

    public bool TryConsume(string jti, long expiresAtUnixSeconds)
    {
        var now = timeProvider.GetUtcNow().ToUnixTimeSeconds();
        foreach (var entry in _consumed)
        {
            if (entry.Value <= now)
                _consumed.TryRemove(entry.Key, out _);
        }

        return expiresAtUnixSeconds > now && _consumed.TryAdd(jti, expiresAtUnixSeconds);
    }
}
