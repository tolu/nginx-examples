# proxy-for-node

In this example all requests under `/node` are proxied to a backing service.

The backing service is a simple node app running express and responding to every request (`app.get('*', handler)`) with info about the request and network, like so:

```json
{
  "version": "Node (v9.4.0) / Express (4.16.2)",
  "remoteAddress": "::ffff:172.18.0.2",
  "uri": "/node",
  "headers": {
    "host": "nodebackend",
    "connection": "close",
    "cache-control": "max-age=0",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36",
    "upgrade-insecure-requests": "1",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "en-US,en;q=0.9,sv-SE;q=0.8,sv;q=0.7,nb-NO;q=0.6,nb;q=0.5",
    "cookie": "_ga=GA1.1.216765478.1505459969",
    "if-none-match": "W/\"239-fUTD3AgjSrJ1CYbBisQhedIkVq0\""
  },
  "dns": [
    "127.0.0.11"
  ]
}
```

## Run

```
$ docker-compose up
```

Re-run after making changes

```
$ docker-compose build && docker-compose up
```

## Nginx configuration

All requests under the location `/node` are proxied to the backing service. This is the entire configuration for that part

> The entire config can be found in [./nginx/etc/nginx/conf.d/default.conf](./nginx/etc/nginx/conf.d/default.conf)

```nginx
location /node {
  proxy_pass http://nodebackend;
}
```