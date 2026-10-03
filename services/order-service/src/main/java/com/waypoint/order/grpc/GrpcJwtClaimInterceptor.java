package com.waypoint.order.grpc;

import io.grpc.Context;
import io.grpc.Contexts;
import io.grpc.Metadata;
import io.grpc.ServerCall;
import io.grpc.ServerCallHandler;
import io.grpc.ServerInterceptor;
import io.grpc.ServerCall.Listener;
import net.devh.boot.grpc.server.interceptor.GrpcGlobalServerInterceptor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@GrpcGlobalServerInterceptor
public class GrpcJwtClaimInterceptor implements ServerInterceptor {

    private static final Logger LOGGER = LoggerFactory.getLogger(GrpcJwtClaimInterceptor.class);
    private static final Metadata.Key<String> JWT_SUB = Metadata.Key.of("x-jwt-sub", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> JWT_ROLE = Metadata.Key.of("x-jwt-role", Metadata.ASCII_STRING_MARSHALLER);
    private static final Context.Key<String> JWT_SUB_CONTEXT = Context.key("jwt-sub");
    private static final Context.Key<String> JWT_ROLE_CONTEXT = Context.key("jwt-role");

    @Override
    public <ReqT, RespT> Listener<ReqT> interceptCall(
        ServerCall<ReqT, RespT> call,
        Metadata headers,
        ServerCallHandler<ReqT, RespT> next) {
        String subject = headers.get(JWT_SUB);
        String role = headers.get(JWT_ROLE);
        LOGGER.debug("Received propagated gRPC JWT claims subject={} role={} method={}",
            subject, role, call.getMethodDescriptor().getFullMethodName());

        Context context = Context.current()
            .withValues(JWT_SUB_CONTEXT, subject, JWT_ROLE_CONTEXT, role);
        return Contexts.interceptCall(context, call, headers, next);
    }
}