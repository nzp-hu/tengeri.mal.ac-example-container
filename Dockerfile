FROM docker.io/nginx/nginx-unprivileged:stable-alpine

# Add static files
COPY --chown=101:0 src/ /usr/share/nginx/html/

# Override default nginx config
COPY --chown=101:0 default.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
