package com.waypoint.order.exception;
import org.springframework.http.HttpStatus;import java.util.*;
public class ApiException extends RuntimeException {public final HttpStatus status;public final String code;public final Map<String,Object> extra;public ApiException(HttpStatus s,String c,String m){this(s,c,m,Map.of());}public ApiException(HttpStatus s,String c,String m,Map<String,Object>x){super(m);status=s;code=c;extra=x;}}
