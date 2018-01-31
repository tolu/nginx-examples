# proxy-with-ssl

In this example all requests under `/` are proxied to a backing service with Nginx SSL termination.
HTTP is also directed to HTTPS.

The backing service is a simple node app running express and responding to every request (`app.get('*', handler)`) with info about the request and network, like so:


## Run

```
$ docker-compose up
```

Re-run after making changes

```
$ docker-compose build && docker-compose up
```

## Nginx configuration

Obtaining a certificate is the hard part, using it is the easy part.

> The entire config can be found in [./nginx/etc/nginx/conf.d/default.conf](./nginx/etc/nginx/conf.d/default.conf)

```nginx
# configure ssl

```