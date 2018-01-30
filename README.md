# nginx-examples
Explainer for nginx configuration with examples

- [nginx-examples](#nginx-examples)
    - [`nginx.conf` explained](#nginxconf-explained)
        - [The basics](#the-basics)
        - [Events and http section](#events-and-http-section)
        - [Creating virtual hosts with the `server` block directive](#creating-virtual-hosts-with-the-server-block-directive)
        - [The `location` block directive and serving files](#the-location-block-directive-and-serving-files)
        - [MIME types (multi-purpose internet mail extensions)](#mime-types-multi-purpose-internet-mail-extensions)
    - [Reverse Proxy](#reverse-proxy)
    - [HTTP Caching of proxy responses](#http-caching-of-proxy-responses)
    - [Enable Gzip](#enable-gzip)
    - [Enable SSL (HTTPS)](#enable-ssl-https)
    - [Enable HTTP/2](#enable-http2)
    - [Other resources](#other-resources)

> This repository was created as reference for myself to learn nginx while going through [nginx beginner to advanced](https://www.udemy.com/nginx-beginner-to-advanced)

What follows is a bunch of code blocks with bits and pieces of `nginx.conf` complete with comments.
Fully working examples can be found in the folders 
* [*proxy-for-node*](./proxy-for-node)
* [*proxy-with-cache*](./proxy-with-cache)
* [*proxy-with-ssl*](./proxy-with-ssl)  (TODO!)
* [*proxy-with-cache-ssl-gzip-h2*](./proxy-with-cache-ssl-gzip-h2) (TODO!)

All examples can be run with a simple [`docker-compose up`](https://docs.docker.com/compose/gettingstarted/) and build on the official [nginx container](https://hub.docker.com/_/nginx/).

**Resources**
 * [Nginx variables ref](http://nginx.org/en/docs/varindex.html)
 * [Nginx official container](https://hub.docker.com/_/nginx/)

## `nginx.conf` explained

> nginx has a master process that reads the configuration and creates worker processes to handle all the action

### The basics

Nginx consists of `modules` which are controller by `directives` in the config file.
There are `simple` and `block` *directives*.
A simple directive consists of the name and parameters separated by spaces and end with a **semicolon** (`;`).
A block directive on the other hand has the same structure but ends with a set of instructions surrounded by **braces** (`{}`).

If a block directive can have other directives inside the braces it is called a `context`.

Example
```nginx
# nginx.conf

# line comments start with a "#"

# a directive in the "main" context


http {
    # the http context...

    server {
        # the server context...

        location {
            # the location context...

        }
    }
}

```

The `main` context
```nginx
# set the user that runs the worker processes
user nginx;

# set to number or auto = the number of cpu's available
worker_processes auto;

# the location of the master process pid
pid /var/run/nginx.pid
```

### Events and http section

First off, `include <path to config>` can be used in all sections to import config from another file.

> To test that the `nginx.conf` is all right run `nginx -t` to test the configuration
> To reload nginx after you made changes to the config run `nginx -s reload`

```nginx
events {
    # set max nr of connections for each worker
    worker_connection 1024;
}

http {
    # create named log format
    log_format main '$remote_addr - $remote_user - [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referrer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    # specify output for logs and named log format
    access_log /var/log/nginx/access.log main;

    # to print logs directly to standard out use next line
    # access_log /dev/stdout main;

    # include mime types from bundled file in http section and set the default
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Load modular configuration files from /etc/nginx/conf.d directory
    # See http://nginx.org/en/docs/ngx_core_module.html#include
    # for more information
    include /etc/nginx/conf.d/*.conf

    # the use of the include command avoids bloat of nginx.conf and makes bug-hunting easier
    # divide and conquer!
}
```

### Creating virtual hosts with the `server` block directive

Listening to ports and host names.
Each `server` section below contain a single example, so match and use how ever you desire.

```nginx
# /etc/nginx/conf.d/default.conf

server {
    # listen on port 80
    listen 80;
}
server {
    # listen on port 80 for specific host name
    listen somename:80;
}
server {
    # Or assign the host via "server_name"
    # You can include wildcards and regex split the definition on multiple lines
    listen 80;
    server_name domain.com
                sub.domain.com
                *.domain.com
                ~^(?<user>.+)\.domain\.com$;
}
server {
    listen 80;
    # "_" is often seen in example configuration
    # "_" (or "--" and "!@#") represents a "catch-all" domain name, simply because it is an invalid domain name
    server_name _;
}
server {
    # you can use a specific configuration as the default server for a port
    # so that this configuration will respond when the host is other than what has been defined
    listen 80 default_server;
}
```

### The `location` block directive and serving files

> [A really good article about server/location-block selection algorithms](https://www.digitalocean.com/community/tutorials/understanding-nginx-server-and-location-block-selection-algorithms)

To actually respond to routes/paths we need to define `location` block sections with specific prefixes, like so `location <optional_modifier> <location_match> {}`

**Modifiers**
* `(none)` => `location_match` matches beginning of req URI
* `=` => `location_match` matches exact req URI
* `~` => `location_match` is case *sensitive* regex
* `~*` => `location_match` is case *insensitive* regex
* `^~` => `location_match` best non-regular expression match

**Examples**
* `location /` matches everything on and under the root
* `location /page1` matches everything on and under the `/page1`
* `location = /` matches only the root
* `location ~ \.(jpe?g|png|gif|ico)$` matches lower case image files
* `location ~* \.(jpe?g|png|gif|ico)$` matches all image files
* `^~/costumes` prevents regex matching if it is determined to be the best non-regex match

To serve files you might use `root` / `alias` together with the `index` or `try_files` directives.

```nginx
server {
    # listen etc here...

    location / {
        # try to serve 'index.html' when match is a directory
        index index.html;

        # try to serve the requested uri as a file ($uri)
        # the requested uri as a file with html ending ($uri.html)
        # the requested uri as a directory ($uri/)
        # and fallback to index.html
        try_files $uri $uri.html $uri/ index.html;
    }
}
```

Using root and alias
```nginx
server {
    # define root folder for files
    # when trying files the request path is added to root to that file = <root>/<request_path>

    root /var/www/html;

    location / {
        # root directive is inherited here
        # a request for '/image/logo.png' will be served from '/var/www/html/image/logo.png'
    }

    location /img/ {
        alias /var/www/images/;
        # a request for '/img/logo.png' will be served from '/var/www/images/logo.png'
        
        # so, when a location matches the last part of the alias path
        # it is better to use the root directive
    }

    # when an alias is used in a location defined with a regex, that regex should
    # contain captures and alias should refer to these captures
    location ~ ^/users/(.+\.(?:gif|jpe?g|png))$ {
        alias /data/w3/images/$1;
    }
}
```

Generally speaking only a single location block is selected to serve a request, without interference from other location blocks.

However, there are some directives that *might* lead to internal redirects:
* `index`
* `try_files`
* `rewrite`
* `error_page`

For instance
```nginx

# Here a request for '/somefile' hits the first section
# trying for a file named '/var/www/main/somefile' => '/var/www/main/somefile.html' => '/var/www/main/somefile/'
# and finally '/fallback/index.html'
# The last part triggers a new location search that is caught by the second block
# serving the file at '/var/www/another/fallback/index.html'

root /var/www/main;
location / {
    try_files $uri $uri.html $uri/ /fallback/index.html;
}
location /fallback {
    root /var/www/another;
}
```

Another example with `rewrite`
```nginx
# Here a request for '/rewriteme/hello' is caught by the first block
# rewriting the request to '/hello' that triggers a location search again selecting the first block
# that tries for files and ends up in the second block as explained in the above example

root /var/www/main;
location / {
    rewrite ^/rewriteme/(.*)$ /$1 last;
    try_files $uri $uri.html $uri/ /fallback/index.html;
}

location /fallback {
    root /var/www/another;
}
```

### MIME types (multi-purpose internet mail extensions)

How does nginx know about correct mime types?

You remember these lines from the `http` section above
```nginx
include /etc/nginx/mime.types;
default_type application/octet-stream;
```
Now that file (`mime.types`) looks like this
```nginx
types {
    text/html           html html shtml;
    text/css            css;
    ...                 ...
}
```
meaning that nginx induces, based on the file ending, which content-type to set for the response.

For any file that is not a part of that list, nginx sets the default `application/octet-stream` as defined.

> `application/octet-stream` (in mime.types) is also used for files ending with [bin exe dll deb dmg iso img msi msp msm]

## Reverse Proxy

The best feature of nginx!
* hides the existence of original backend server
* can protect the backend server from high load via caching
* can optimize the content with h2 or compressing content
* can act as a SSL termination proxy
* and of course route to several backend servers, acting as a load balancer/router

For instance
```
          |———————|    |———————|
Client => | NGINX | => | Node  |
          |———————|    |———————|
```

Basic example, with a single backend server using the `proxy_pass` directive
```nginx
# /etc/nginx/conf.d/default.conf

# set up virtual server that proxies all traffic to backing server
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        # be aware of using a trailing slash here
    }
}
```

Typically you will want to provide some extra headers for your backend (and maybe get rid of some).
This can be accomplished with other `proxy_*` directives.

Specifically the backend server might be interested in the host header sent by the client as the same server might respond to requests from different domains/hosts and have logic to handle that.

> A reference for proxy directives [can be found here](http://nginx.org/en/docs/http/ngx_http_proxy_module.html)

Add/remove headers example:
```nginx
server {
    listen 80;
    server_name _;

    location / {
        # provide the host as nginx received it
        proxy_set_header Host $host;

        # pass on the client remote address (for IP filtering etc)
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # $proxy_add_x_forwarded_for is an embedded variable that
        # evaluates to existing X-Forwarded-For and uses $remote_addr as fallback

        # remove any X-Powered-By provided by backing server, by un-setting the header
        add_header X-Powered-By "";

        proxy_pass http://localhost:3000;
    }
}
```

**Using nginx as a load balancer**  

Scale your app with nginx and get high availability.
```
                       |———————|
                       | Node  |
          |———————| => |———————|          
Client => | NGINX |    
          |———————| => |———————|
                       | Node  |
                       |———————|
```

Example
```nginx

# define a named backend (a.k.a) upstream server
# with servers on ports 3000 and 5000
upstream backend {
    server localhost:3000;
    server localhost:5000;

    # "keepalive <connections>"
    # Activates cache for connections to upstream servers
    # Sets the minimum nr of connections, more are created as needed
    # Caching connections significantly increase performance (avoids handshakes)
    keepalive 32;
}

server {
    listen 80;
    server_name _;

    location / {
        # set http version to support keep-alive connections
        proxy_http_version 1.1;
        # avoid closing connections to keep them in cache (keepalive in upstream block)
        proxy_set_header Connection "";

        proxy_pass http://backend;
    }
}

```

**Health checks in load balancer configurations**
A potential issue when load balancing is that one of the backing servers dies and keeps receiving traffic from nginx.
The solution for this is using health checks.

Open source nginx supports passive health checks. Which means that it monitors communication with the upstream server. If the upstream server is unresponsive or rejecting connections the server will be considered unhealthy.

Passive monitoring is done automatically, so a requests that fails for one server will automatically be transferred to the other server (in our setup above) with only a time penalty paid by the user.

After the first server is up and running again there is a timeout that decides for how long the server have to be healthy before nginx starts passing traffic its way again.

Configuring passive health monitoring
 * `max_fails=2` => consider healthy if requests fails twice in the time frame set below
 * `fail_timeout=15` => as described above, and the period of time the server will be considered unavailable

Defaults are 1 fail and 10 seconds.

Example
```nginx
upstream {
    server localhost:3000;
    server localhost:5000 max_fails=2 fail_timeout=30;
}
```

Other parameters that can be set on the server directive is
* `max_conns=1024` limits the max number of connections to the server
* `weight=1` the weight of the server, i.e. probability of usage (default is 1)
* `backup` marks server as backup, only to be used if primary fails
* `down` marks server as permanently unavailable
* `drain` place server in drain mode, only requests that are bound to that server will be proxied

[Full list of settings](http://nginx.org/en/docs/http/ngx_http_upstream_module.html#server)


## HTTP Caching of proxy responses

* [Nginx caching guide](https://www.nginx.com/blog/nginx-caching-guide/)
* [Nginx content caching](https://www.nginx.com/resources/admin-guide/content-caching/)
* [USING NGINX TO AVOID NODE.JS LOAD](http://blog.argteam.com/coding/hardening-node-js-for-production-part-2-using-nginx-to-avoid-node-js-load/)

Let nginx be your content cache (a server in between the client and the origin) and serve content without going to the backend server at all, especially good for offloading backend servers.
Also, nginx is amazingly fast at serving static files content from the local file system, much more so that for instance nodejs.

> Moreover, it supports the [sendfile](https://linux.die.net/man/2/sendfile) syscall to serve those files which is as fast as you can possibly get at serving files, since it's the OS kernel itself that's doing the job.

**CACHING is only activated** when upstream server provides headers hints like Cache-Control!
It does not cache responses with `Cache-Control` set to `Private,No-Cache` or `No-Store` or with `Set-Cookie` in the response header.

`Cache-Control` from the origin CAN be ignore, like so
```nginx
location /images/ {
    proxy_cache my_cache;
    proxy_ignore_headers Cache-Control;
    proxy_cache_valid any 30m;
    # ...
}
```

We need two directives to activate the cache, `proxy_cache_path` for configuration and `proxy_cache` (in a location block) to activate it.

The `proxy_cache_path <path> [...settings]` directive define the following settings:
 * `<path>` - local disc directory
 * `levels=1:2` - sets up a 2 level directory hierarchy under `<path>`. As a large number of files can slow down file access.
 * `keys_zone=one:8m` - sets up shared memory zone for cache keys and metadata of 8MB. A 1MB zone can store ~8000 keys.
 * `max_size=10g` - sets upper limit of the cache. Optional. When the cache reach it's limit a process removes the files least recently used.
 * `inactive=10m` - the time an asset can stay in the cache un-accessed. Regardless off if it has expired. Nginx does not automatically delete expired (as set by headers) assets, it simply refreshes it from the origin server when requested.

Static file intercept
```nginx

http {
    # Enable cache and define local path for where to keep cached files
    # "levels=1:2"       set directory depth
    # "keys_zone=one:8m" name this cache "one" and set size of shared memory zone (8m) used for metadata
    # "max_size=300m"    set total cache max size to 300MB
    # "inactive=600m"    expire time for unused assets, defaults to 10m (minutes)
    proxy_cache_path  /var/cache/nginx levels=1:2 keys_zone=one:8m max_size=3000m inactive=600m;
    
    # cached files are first written to temporary location, define where here
    proxy_temp_path /var/tmp;

    server {

        location ~* \.(css|js|map)$ {
            # select cache to use
            proxy_cache one;

            # define the cache key
            # i.e. the string to create a MD5 hash from
            proxy_cache_key $scheme$proxy_host$request_uri; # <== default

            # turn off access logs for static files
            access_log off;

            # mark assets as immutable (can set specific time like "1h" instead)
            expires max;

            # include cache status header with potential values:
            # [HIT, MISS, BYPASS, EXPIRED, STALE, UPDATING, REVALIDATED]
            add_header X-Cache-Status $upstream_cache_status;
        }
    }
}

```

Delivering stale content when the origin server is down can be achieved with the `proxy_cache_use_stale` directive, like so `proxy_cache_use_stale [...reasons]`.

For instance:
```nginx
location / {
    # ...
    proxy_cache_use_stale error timeout updating invalid_header http_500 http_502 http_503 http_504 http_404 http_403;
}
```
There are also a bunch of directives that can be used to fine-tune the cache behaviour inside the `location` directive.

 * `proxy_cache_revalidate on;` - use conditional GET (Last-Modified-Since) to origin server when refreshing assets to save bandwidth and time.
 * `proxy_cache_min_uses {nr};` - nr of requests before storing asset in cache (defaults to 1).
 * Setting `proxy_cache_use_stale updating;` in combination with `proxy_cache_background_update on;` instructs nginx to serve stale content when assets has expired and while it refreshes from the origin.
 * Enabling `proxy_cache_lock on;` results in a cache MISS from multiple clients to only make one request to the origin server, letting the remaining requests wait and then serving from cache once the refresh completes.


Defining when to bypass the cache ("*punching a hole in the cache*"):
```nginx
# define conditions when response will not be taken from cache
proxy_cache_bypass $http_cache_control $http_authorization $cookie_nocache $arg_nocache $http_pragma;
# bypasses cache if any provided argument is not empty and not equal to "0"
# $arg_nocache => http://example.com/?nocache=true
```

Using stale cache while nginx updates from backing server:
```nginx
proxy_cache_background_update on;       # allow background fetch of expired asset
proxy_cache_use_stale timeout updating; # use stale cache asset while updating
proxy_cache_lock on;                    # allow only one request to populate the cache
```

## Enable Gzip

**Why?**  
Significantly reduces the size of transmitted data.

**How?**  

[Nginx: Compression and decompression](https://www.nginx.com/resources/admin-guide/compression-and-decompression/)

```nginx
# place directive in http, server or location context
http {
    gzip on;                                # enable compression, both static and dynamic content
    gzip_types text/plain application/xml;  # list of mime types to compress, default is only "text/html"
    gzip_min_length 1000;                   # set min length of content for using compression, default is 20 bytes
    gzip_proxied no-cache no-store private; # use compression for proxied responses if Cache-Control is "no-cache", "no-store" or "private".
                                            # Set to "any" to enable for all responses

    gzip_comp_level 6;                      # set compression level [1-9]
    gzip_http_version 1.1;                  # set min http version for using gzip
    gzip_vary on;                           # enable inserting the "Vary: Accept-Encoding" header

    server {
        location / {
            # to send a compressed version of a file, enable:
            gzip_static on;
            # note that this does not enable on-the-fly compression, this simply tries to send <path/file>.gz
        }
    }
}
```

There is also an embedded variable that can be added to the headers to get a glimpse of how efficient the compression is:
```nginx
server {
    location / {
        add_header X-Gzip-Status $gzip_ratio;
    }
}
```

## Enable SSL (HTTPS)

Resources

 * [Why HTTPS Matters (Google Web Fundamentals)](https://developers.google.com/web/fundamentals/security/encrypt-in-transit/why-https)
 * [Enabling](https://developers.google.com/web/fundamentals/security/encrypt-in-transit/enable-https)
 * [Blog: Securing Nginx with HTTPS](https://bjornjohansen.no/securing-nginx-ssl)
 * [Blog: Optimizing HTTPS on Nginx](https://bjornjohansen.no/optimizing-https-nginx)
 * [Blog: Redirect HTTP to HTTPS with Nginx](https://bjornjohansen.no/redirect-to-https-with-nginx)
 * [Blog: Let's Encrypt for Nginx](https://bjornjohansen.no/letsencrypt-nginx)

**Why?**  

 * Prerequisite for HTTP/2! Thats why!
 * Integrity and security
 * Requirement for [service workers](https://developers.google.com/web/fundamentals/primers/service-workers/)

**How?**  

Get a certificate from [letsencrypt](https://letsencrypt.org/)

Or go through this guide: [free-certificates-lets-encrypt-and-nginx](https://www.nginx.com/blog/free-certificates-lets-encrypt-and-nginx/)

If you have a `*.pfx` certificate, [see this gist](https://gist.github.com/ericharth/8334664) ([original article here](http://www.markbrilman.nl/2011/08/howto-convert-a-pfx-to-a-seperate-key-crt-file/)) for how you can convert that to a `pem` file.

Example
```nginx

http {

    ##
    # SSL Settings (can be paced in http or server contexts)
    ##

    ssl_certificate     /path/to/cert.crt;
    ssl_certificate_key /path/to/cert.key;

    server {
        # enable ssl on listening sockets
        listen 443 ssl default_server;
        server_name _;

        location / {
            # ...
        }    
    }
}

```

More info and optimization tips can be found in [Nginx: Configuring HTTPS servers](http://nginx.org/en/docs/http/configuring_https_servers.html)

## Enable HTTP/2

Resources

* [Blog: Enable H2 on Nginx](https://bjornjohansen.no/enable-http2-on-nginx)

> note that the SPDY module have been replaced with the HTTP/2 module in Nginx

**Why?**
HTTP/2 is binary (the native computer language), instead of textual which makes it easier to parse, more compact and less error-prone.
HTTP/2 is fully multiplexed, i.e. can send multiple requests for data in parallel over a single TCP connection.
Support for **server push**, i.e. additional resources can be pushed to the client for future use.
Uses header (HPACK) compression which reduces overhead.

**How!**
```nginx

# make sure to enable SSL first
# as this is a requirement for H2

server {
    # just add these lines to the listen directive
    listen 443 ssl http2;
}

```

## Other resources

 * [Nginx Complete Cookbook](https://www.nginx.com/resources/library/complete-nginx-cookbook/)
 * [Nginx/Slidedeck: Basics and Best Practices](https://www.slideshare.net/Nginx/nginx-basics-and-best-practices) from 2017-05-26
 * [Nginx: Pitfalls and common mistakes](https://www.nginx.com/resources/wiki/start/topics/tutorials/config_pitfalls/)
 * [Github/h5bp: Nginx HTTP server boilerplate configs](https://github.com/h5bp/server-configs-nginx)
 * [Gist: Tuning Nginx for performance](https://gist.github.com/denji/8359866)
 * [Blog: Nginx redirects](https://bjornjohansen.no/nginx-redirect)