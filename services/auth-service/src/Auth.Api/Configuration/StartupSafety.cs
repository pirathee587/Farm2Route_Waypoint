using Microsoft.Extensions.Configuration;
using Npgsql;

namespace Auth.Api.Configuration;

public static class StartupSafety
{
    public static async Task InitializeAsync(IConfiguration config, bool development,
        Func<Task> initialize, Func<Task> seed, Func<Task<bool>> canConnect)
    {
        var initializeRequested = config.GetValue<bool>("Database:Initialize");
        var seedRequested = config.GetValue<bool>("Database:SeedDevelopmentAccounts");
        if (!development && (initializeRequested || seedRequested))
            throw new InvalidOperationException("Database initialization and development seeding are forbidden outside Development.");
        // No swallowed exceptions: a failed explicit initialization aborts startup.
        if (initializeRequested) await initialize();
        if (!await canConnect()) throw new InvalidOperationException("Auth database is unavailable.");
        if (seedRequested) await seed();
    }

    public static string ConnectionString(IConfiguration config)
    {
        var ssl = config["DB_SSL_MODE"] ?? "VerifyFull";
        if (!string.Equals(ssl, "VerifyFull", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Auth requires DB_SSL_MODE=VerifyFull.");
        return new NpgsqlConnectionStringBuilder {
            Host = config["SUPABASE_DB_HOST"],
            Port = int.Parse(config["SUPABASE_DB_PORT"] ?? "5432"),
            Database = config["SUPABASE_DB_NAME"],
            Username = config["SUPABASE_DB_USER"],
            Password = config["SUPABASE_DB_PASSWORD"],
            SslMode = SslMode.VerifyFull,
            Pooling = true, MaxPoolSize = 4, MinPoolSize = 0,
            RootCertificate = config["DB_ROOT_CERTIFICATE"]
        }.ConnectionString;
    }
}
