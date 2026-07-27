# TLS certificates

Place `fullchain.pem` and `privkey.pem` here, then uncomment the `:443` server block in
`../nginx.conf` and switch the `:80` server to `return 301 https://$host$request_uri;`.

With certbot on the host:

```bash
certbot certonly --standalone -d your-domain.com
```

Then copy (or symlink) `/etc/letsencrypt/live/your-domain.com/{fullchain,privkey}.pem` into this
directory and reload nginx:

```bash
docker compose exec nginx nginx -s reload
```

This directory is mounted read-only into the container. Never commit private keys.
