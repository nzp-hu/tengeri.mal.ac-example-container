# tengeri.mal.ac example container

An example container serving the static files of [tengeri.mal.ac](https://tengeri.mal.ac). \
Based on [`nginx/nginx-unprivileged`](https://hub.docker.com/r/nginx/nginx-unprivileged).

Exposes port `8080`.

Build locally by
```sh
podman build -t <your preferred tag> .
# or
docker build -t <your preferred tag> .
```

Run locally by
```sh
podman run --rm -p 8080:8080 <tagged image>
```
