# Seed Data

The repository includes synthetic Challenge Booklet-compatible datasets:

- `outlets.csv`
- `vehicles.csv`
- `calendar.csv`

`ReferenceDataSeeder` loads each dataset on startup when its destination table
is empty. `seed.sql` remains available for independent `psql` loading.
