# Maintenance

## Migration

Add new and old connection strings to environment variables:

```
export OLD_CONN_STRING='postgresql://...'
export NEW_CONN_STRING='postgresql://...'
```

Create a database in new location:

```
psql $NEW_CONN_STRING -c "CREATE DATABASE receipt LC_CTYPE 'C.UTF-8' LC_COLLATE 'C.UTF-8' LOCALE_PROVIDER icu ICU_LOCALE 'und-x-icu' TEMPLATE template0;"
```

Dump data from old location to the new one:

```
pg_dump $OLD_CONN_STRING | psql $NEW_CONN_STRING
```

Or with file saved:

```
psql $OLD_CONN_STRING > data.sql
psql $NEW_CONN_STRING < data.sql
```
