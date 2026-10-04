import psycopg

conn = psycopg.connect('host=aws-0-ap-southeast-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.xdsmwvwxqtfnwokdxptk password=WayPoint12345@ sslmode=require')
cur = conn.cursor()
cur.execute('SELECT "Id", "Email", "Role" FROM auth_schema.users WHERE "Email" = %s', ('drv014@waypoint.lk',))
print('User:', cur.fetchone())

cur.execute('SELECT trip_id, trip_number, driver_id, vehicle_id, delivery_date FROM public.trips LIMIT 10')
print('Trips:')
for r in cur.fetchall():
    print(r)

cur.close()
conn.close()
