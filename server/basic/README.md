# Back end server of the Timed Walk App

Basic server: a basic, file based server, no dashboard or database and limited security.

## Run

```bash
npm run run
```

## Run as Docker container

most env variables except JWT_SECRET have a default in the dockerfile but it makes sense to configure them and bring the team.json and test-results on an external volume:

```sh
docker build . -t twaapi
docker run  -e JWT_SECRET=xxxxxxxxx -p 3000:3000  twaapi
```

# Develop

```bash
npm run dev
```

to run a development version of the server with auto restart.
