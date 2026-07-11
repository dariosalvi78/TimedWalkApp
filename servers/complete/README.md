# Timed Walk App Complete Server

Have nodejs installed, see root folder .nvmrc for version.

## Development

The server relies on Postgres, for a development enviroment run it with (from the root folder of TimedWalkApp):

```sh
docker run --name twadb-test -p 5432:5432 -e POSTGRES_PASSWORD=mysecretpassword -v ./datamodel/schema.sql:/docker-entrypoint-initdb.d/ -d postgres:18-alpine3.24
```

You will access this instance as postgres / mysecretpassword.

Create a .env.local file with the following variables:

```
LOGLEVEL=debug
PGUSER=postgres
PGPASSWORD=mysecretpassword
PGDATABASE=postgres
PGHOST=localhost
PGPORT=5432
```

## Automatic tests

Have the test instance of Postgres running and call:

```sh
npm run test
```

Tests assume that the postgres root variable is `mysecretpassword`.
