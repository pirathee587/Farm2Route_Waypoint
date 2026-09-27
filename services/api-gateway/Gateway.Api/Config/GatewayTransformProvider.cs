using Yarp.ReverseProxy.Transforms;
using Yarp.ReverseProxy.Transforms.Builder;

namespace Gateway.Api.Config;

/// <summary>
/// YARP Request Transform:
/// Adds X-Gateway-Verified: true header to every forwarded request.
/// Backend services check this header to confirm the request
/// came through the gateway (and therefore JWT was already validated).
///
/// Also strips the original Authorization header from downstream requests
/// — backends only need the X-User-* headers injected by JwtValidationMiddleware.
/// </summary>
public sealed class GatewayTransformProvider : ITransformProvider
{
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

        // Remove Authorization header from upstream request.
        // X-User-Id / X-User-Role / X-User-Email are already injected
        // by JwtValidationMiddleware — that's enough for backend trust.
        context.AddRequestHeaderRemove("Authorization");
    }
}
