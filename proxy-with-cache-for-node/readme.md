# proxy-with-cache-for-node

In this example all requests under `/node` are proxied to a backing service.
Caching of static files and content compression is handled by `nginx`.

The backing service is a simple node app running express and responds to every request (`app.get('*', handler)`) with a html page containing info about the request and network. It also serves static files with some javascript and css that should be cached by `nginx`.

For the caching to kick in on the `nginx` side of things, we need to provide header hints for static files like `Cache-Control: public, max-age={seconds}`

To see that the cache is working
 * monitor the output from node and make sure that not all requests also results in GET for js/css
 * check headers of js/css in chrome dev tool and look for `X-Proxy-Cache: HIT` (success)

## Run

```
$ docker-compose up
```

Re-run after making changes

```
$ docker-compose build && docker-compose up
```

## Nginx configuration

All requests under the location `/` are proxied to the backing service.
All requests ending in `js|css|ico` are cached by nginx.

> The entire config can be found in [./nginx/etc/nginx/conf.d/default.conf](./nginx/etc/nginx/conf.d/default.conf)

Simplified example
```nginx
# Setup path for where to keep cached files
# Name cache ("one") and use 1MB (":1m") for metadata (~8000 keys)
proxy_cache_path  /var/cache/nginx keys_zone=one:1m;

# cached files are first written to temporary location, define where
proxy_temp_path /var/tmp;            

# set cache key, defaults to: $scheme$proxy_host$request_uri
proxy_cache_key $request_uri$scheme; 

server {
  listen 80;
  server_name _;

  # enable cache for all requests ending with .js|.css|.ico
  location ~* \.(css|js|ico)$ {
    # select cache
    proxy_cache one;
    # add Cache-Control and Expires headers. 
    expires 2m;

    # cache 200, 301, 302 responses for 1 minute
    proxy_cache_valid 1m;

    # include cache status header with potential values [HIT, MISS, BYPASS]
    add_header X-Proxy-Cache $upstream_cache_status;
  }
}
```