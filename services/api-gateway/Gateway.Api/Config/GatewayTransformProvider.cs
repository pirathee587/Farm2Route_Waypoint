using Yarp.ReverseProxy.Transforms;
using Yarp.ReverseProxy.Transforms.Builder;

namespace Gateway.Api.Config;

/// <summary>
/// YARP Request Transform:
/// Adds X-Gateway-Verified: true header to every forwarded request.
/// Backend services check this header to confirm the request
/// came through the gateway (and therefore JWT was already validated).
///
/// Preserves bearer authentication for Auth; other backends receive verified identity headers.
/// </summary>
public sealed class GatewayTransformProvider : ITransformProvider
{
    public static bool PreserveAuthorization(string? clusterId) => clusterId == "auth-cluster";

    public void ValidateRoute(TransformRouteValidationContext context) { }
    public void ValidateCluster(TransformClusterValidationContext context) { }

    public void Apply(TransformBuilderContext context)
    {
        // Add a trust marker header — backends verify this
        context.AddRequestHeader("X-Gateway-Verified", "true", append: false);

        // Forward the original client IP
        context.AddXForwardedFor();
        context.AddXForwardedHost();
        context.AddXForwardedProto();

        // Auth validates the bearer token itself. Other services trust headers only
        // within the gateway-only network boundary.
        if (!PreserveAuthorization(context.Route.ClusterId))
            context.AddRequestHeaderRemove("Authorization");
    }
}
