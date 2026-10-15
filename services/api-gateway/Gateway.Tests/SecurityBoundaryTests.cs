using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Gateway.Api.Config;
using Gateway.Api.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.IdentityModel.Tokens;
using System.Net.WebSockets;
using Xunit;

namespace Gateway.Tests;
public class SecurityBoundaryTests
{
    private static readonly string Secret = new string('x',64);
    private static IConfiguration Config() => new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?> {
        ["Jwt:Secret"]=Secret,["Jwt:Issuer"]="issuer",["Jwt:Audience"]="clients",
        ["Cors:AllowedOrigins:0"]="https://farm2-route-waypoint.vercel.app"
    }).Build();
    private static ClaimsPrincipal User() => new(new ClaimsIdentity(new[] {new Claim("sub",Guid.NewGuid().ToString()),new Claim("role","DRIVER")},"fixture"));
    private static DefaultHttpContext Request(string path) { var c=new DefaultHttpContext();c.Request.Path=path;c.Response.Body=new MemoryStream();return c; }
    private static Task Run(DefaultHttpContext c, RequestDelegate next, WebSocketTicketReplayCache? cache=null) => new JwtValidationMiddleware(next,NullLogger<JwtValidationMiddleware>.Instance,Config(),cache ?? new WebSocketTicketReplayCache(TimeProvider.System)).InvokeAsync(c);
    [Fact] public async Task PublicPrefixDoesNotBypassAuthentication()
    {
        var c=Request("/api/auth/login/admin");bool forwarded=false;
        await Run(c,_=> {forwarded=true;return Task.CompletedTask;});
        Assert.False(forwarded);Assert.Equal(401,c.Response.StatusCode);
    }
    [Fact] public async Task PublicRouteStripsAllSpoofedIdentityHeaders()
    {
        var c=Request("/api/auth/login");c.Request.Headers["X-User-Role"]="ADMIN";c.Request.Headers["X-Gateway-Verified"]="true";
        await Run(c,x=> {Assert.False(x.Request.Headers.ContainsKey("X-User-Role"));Assert.False(x.Request.Headers.ContainsKey("X-Gateway-Verified"));return Task.CompletedTask;});
    }
    [Fact] public void BearerForwardingIsLimitedToAuthCluster()
    {
        Assert.True(GatewayTransformProvider.PreserveAuthorization("auth-cluster"));
        Assert.False(GatewayTransformProvider.PreserveAuthorization("loading-cluster"));
    }
    [Fact] public async Task WebsocketTicketCannotAuthorizeRest()
    {
        var c=Request("/api/orders");c.Request.Headers.Authorization="Bearer "+WebSocketTickets.Issue(User(),Config());
        await Run(c,_=>throw new Exception("must not forward"));Assert.Equal(401,c.Response.StatusCode);
    }
    [Theory] [InlineData("")] [InlineData("https://evil.example")]
    public async Task WebsocketOriginIsEnforced(string origin)
    {
        var c=Request(WebSocketTickets.Path);c.Features.Set<IHttpWebSocketFeature>(new SocketFeature());c.Request.Headers.Origin=origin;
        await Run(c,_=>throw new Exception("must not forward"));Assert.Equal(403,c.Response.StatusCode);
    }
    [Fact] public async Task ValidTicketUsesClaimsAndIsNotProxiedAsProtocol()
    {
        var c=Request(WebSocketTickets.Path);c.Features.Set<IHttpWebSocketFeature>(new SocketFeature());
        c.Request.Headers.Origin="https://farm2-route-waypoint.vercel.app";
        c.Request.Headers["Sec-WebSocket-Protocol"]="waypoint, "+WebSocketTickets.ProtocolPrefix+WebSocketTickets.Issue(User(),Config());
        bool forwarded=false;
        await Run(c,x=> {forwarded=true;Assert.Equal("DRIVER",x.Request.Headers["X-User-Role"].ToString());Assert.Equal("waypoint",x.Request.Headers["Sec-WebSocket-Protocol"].ToString());return Task.CompletedTask;});
        Assert.True(forwarded);
    }
    [Fact] public async Task WebsocketTicketReuseIsRejected()
    {
        var ticket=WebSocketTickets.Issue(User(),Config());var cache=new WebSocketTicketReplayCache(TimeProvider.System);
        var first=SocketRequest(ticket);var second=SocketRequest(ticket);bool forwarded=false;
        await Run(first,_=> {forwarded=true;return Task.CompletedTask;},cache);
        await Run(second,_=>throw new Exception("replayed ticket must not forward"),cache);
        Assert.True(forwarded);Assert.Equal(401,second.Response.StatusCode);
    }
    [Fact] public void ReplayCacheCleansExpiredEntries()
    {
        var clock=new TestTimeProvider(DateTimeOffset.FromUnixTimeSeconds(1000));var cache=new WebSocketTicketReplayCache(clock);
        Assert.True(cache.TryConsume("old",1001));clock.Advance(TimeSpan.FromSeconds(2));
        Assert.True(cache.TryConsume("new",1060));Assert.Equal(1,cache.Count);
    }
    [Theory] [InlineData("HS512",false)] [InlineData("HS256",true)]
    public async Task WrongAlgorithmAndExpiredTokensAreRejected(string algorithm,bool expired)
    {
        var t=new JwtSecurityToken("issuer","clients",User().Claims,expires:DateTime.UtcNow.AddMinutes(expired?-5:5),
            signingCredentials:new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Secret)),algorithm));
        var c=Request("/api/orders");c.Request.Headers.Authorization="Bearer "+new JwtSecurityTokenHandler().WriteToken(t);
        await Run(c,_=>throw new Exception("must not forward"));Assert.Equal(401,c.Response.StatusCode);
    }
    private sealed class SocketFeature : IHttpWebSocketFeature {
        public bool IsWebSocketRequest => true;
        public Task<WebSocket> AcceptAsync(WebSocketAcceptContext c) => throw new NotSupportedException();
    }
    private static DefaultHttpContext SocketRequest(string ticket) { var c=Request(WebSocketTickets.Path);c.Features.Set<IHttpWebSocketFeature>(new SocketFeature());c.Request.Headers.Origin="https://farm2-route-waypoint.vercel.app";c.Request.Headers["Sec-WebSocket-Protocol"]="waypoint, "+WebSocketTickets.ProtocolPrefix+ticket;return c; }
    private sealed class TestTimeProvider(DateTimeOffset now) : TimeProvider { private DateTimeOffset _now=now;public override DateTimeOffset GetUtcNow()=>_now;public void Advance(TimeSpan by)=>_now+=by; }
}
