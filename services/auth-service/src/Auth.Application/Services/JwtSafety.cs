using System.Text;
namespace Auth.Application.Services;
public static class JwtSafety
{
    public static string RequireSecret(string? secret)
    {
        if (string.IsNullOrWhiteSpace(secret) || Encoding.UTF8.GetByteCount(secret) < 32 ||
            secret.Contains("SuperSecret", StringComparison.OrdinalIgnoreCase) ||
            secret.Contains("changeme", StringComparison.OrdinalIgnoreCase) ||
            secret.Contains("your_secure", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("A non-default JWT signing secret of at least 32 UTF-8 bytes is required.");
        return secret;
    }
}
