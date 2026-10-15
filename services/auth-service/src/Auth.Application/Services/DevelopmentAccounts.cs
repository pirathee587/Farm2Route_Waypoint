using Microsoft.Extensions.Configuration;
namespace Auth.Application.Services;
public static class DevelopmentAccounts
{
    private static readonly HashSet<string> Accounts = new(StringComparer.OrdinalIgnoreCase)
    { "dispatcher@waypoint.lk", "loader@waypoint.lk", "driver@waypoint.lk", "manager@waypoint.lk", "drv014@waypoint.lk" };
    public static bool IsBlocked(string email, IConfiguration config) =>
        Accounts.Contains(email) && !string.Equals(config["ASPNETCORE_ENVIRONMENT"], "Development", StringComparison.OrdinalIgnoreCase);
}
