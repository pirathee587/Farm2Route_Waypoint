package com.waypoint.planning.config;

import com.fasterxml.jackson.core.type.TypeReference;import com.fasterxml.jackson.databind.ObjectMapper;import com.waypoint.planning.service.PlanningService;import io.grpc.*;import io.grpc.netty.shaded.io.grpc.netty.NettyServerBuilder;import io.grpc.stub.ServerCalls;import jakarta.annotation.*;import org.springframework.beans.factory.annotation.Value;import org.springframework.stereotype.Component;
import java.io.*;import java.nio.charset.StandardCharsets;import java.util.*;

@Component
public class GrpcServer {
  private final PlanningService planning;private final ObjectMapper mapper;private final int port;private Server server;
  public GrpcServer(PlanningService p,ObjectMapper m,@Value("${grpc.server.port:9090}")int port){planning=p;mapper=m;this.port=port;}
  @PostConstruct public void start()throws IOException{
    MethodDescriptor<byte[],byte[]> method=MethodDescriptor.<byte[],byte[]>newBuilder().setType(MethodDescriptor.MethodType.UNARY).setFullMethodName("waypoint.planning.v1.PlanningService/GetTrip").setRequestMarshaller(new BytesMarshaller()).setResponseMarshaller(new BytesMarshaller()).build();
    ServerServiceDefinition definition=ServerServiceDefinition.builder("waypoint.planning.v1.PlanningService").addMethod(method,ServerCalls.asyncUnaryCall((request,observer)->{try{Map<String,Object> body=mapper.readValue(request,new TypeReference<>(){});UUID id=UUID.fromString(Objects.toString(body.get("trip_id")));observer.onNext(mapper.writeValueAsBytes(Map.of("trip",planning.trip(id))));observer.onCompleted();}catch(Exception e){observer.onError(Status.NOT_FOUND.withDescription(e.getMessage()).asRuntimeException());}})).build();
    server=NettyServerBuilder.forPort(port).addService(definition).build().start();
  }
  @PreDestroy public void stop(){if(server!=null)server.shutdown();}
  private static class BytesMarshaller implements MethodDescriptor.Marshaller<byte[]>{public InputStream stream(byte[]value){return new ByteArrayInputStream(value);}public byte[] parse(InputStream stream){try{return stream.readAllBytes();}catch(IOException e){throw new UncheckedIOException(e);}}}
}
