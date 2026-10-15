using Auth.Api.Configuration;
using Auth.Application.Services;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace Auth.UnitTests.Services;

public class StartupSafetyTests
{
    private static IConfiguration Config(params (string,string)[] values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values.ToDictionary(x=>x.Item1,x=>(string?)x.Item2)).Build();

    [Fact] public async Task DefaultsNeverMutateDatabase()
    {
        int mutations=0;
        await StartupSafety.InitializeAsync(Config(), false, () => { mutations++; return Task.CompletedTask; },
            () => { mutations++; return Task.CompletedTask; }, () => Task.FromResult(true));
        Assert.Equal(0,mutations);
    }
    [Theory]
    [InlineData("Database:Initialize")]
    [InlineData("Database:SeedDevelopmentAccounts")]
    public async Task ProductionRejectsMutationFlagsBeforeConnection(string key)
    {
        await Assert.ThrowsAsync<InvalidOperationException>(() => StartupSafety.InitializeAsync(Config((key,"true")),false,
            () => throw new Exception("must not initialize"), () => throw new Exception("must not seed"),
            () => throw new Exception("must not connect")));
    }
    [Fact] public async Task InitializationFailureIsNotSwallowed()
    {
        await Assert.ThrowsAsync<ApplicationException>(() => StartupSafety.InitializeAsync(Config(("Database:Initialize","true")),true,
            () => throw new ApplicationException("fixture failure"), () => Task.CompletedTask,()=>Task.FromResult(true)));
    }
    [Fact] public async Task UnavailableDatabaseStopsStartup()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(()=>StartupSafety.InitializeAsync(Config(),false,
            ()=>Task.CompletedTask,()=>Task.CompletedTask,()=>Task.FromResult(false)));
    }
    [Theory] [InlineData("Require")] [InlineData("Disable")] [InlineData("VerifyCA")]
    public void InsecureTlsModesAreRejected(string mode) =>
        Assert.Throws<InvalidOperationException>(()=>StartupSafety.ConnectionString(Config(("DB_SSL_MODE",mode))));
    [Fact] public void ConnectionStringUsesStrictTlsAndEscapesPassword()
    {
        var c=new NpgsqlConnectionStringBuilder(StartupSafety.ConnectionString(Config(("SUPABASE_DB_HOST","localhost"),("SUPABASE_DB_PASSWORD","fixture;Password=other"))));
        Assert.Equal(SslMode.VerifyFull,c.SslMode);
        Assert.Equal("fixture;Password=other",c.Password);
    }
    [Theory] [InlineData("")] [InlineData("short")]
    [InlineData("WayPoint_SuperSecret_JwtKey_2026_MustBeLongEnough!")]
    public void SigningSecretFailsClosed(string value) => Assert.Throws<InvalidOperationException>(()=>JwtSafety.RequireSecret(value));
    [Fact] public void DevelopmentAccountsAreBlockedWithoutDatabaseMutation()
    {
        Assert.True(DevelopmentAccounts.IsBlocked("MANAGER@waypoint.lk",Config()));
        Assert.False(DevelopmentAccounts.IsBlocked("manager@waypoint.lk",Config(("ASPNETCORE_ENVIRONMENT","Development"))));
        Assert.False(DevelopmentAccounts.IsBlocked("real@example.com",Config()));
    }
}
