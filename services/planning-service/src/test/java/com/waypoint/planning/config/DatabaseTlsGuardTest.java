package com.waypoint.planning.config;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class DatabaseTlsGuardTest {
 @Test void rejectsMissingOrWeakenedTls() {
  assertFalse(DatabaseTlsGuard.strictlyVerified("jdbc:postgresql://localhost/db"));
  assertFalse(DatabaseTlsGuard.strictlyVerified("jdbc:postgresql://localhost/db?sslmode=require"));
  assertFalse(DatabaseTlsGuard.strictlyVerified("jdbc:postgresql://localhost/db?sslmode=verify-full&sslmode=disable"));
  assertFalse(DatabaseTlsGuard.strictlyVerified("jdbc:postgresql://localhost/db?sslmode=verify-full&sslfactory=unsafe"));
 }
 @Test void acceptsVerifiedTls() { assertTrue(DatabaseTlsGuard.strictlyVerified("jdbc:postgresql://localhost/db?sslmode=verify-full&sslrootcert=/fixture/ca.pem")); }
}
