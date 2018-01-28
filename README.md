# nginx-examples
Explainer for nginx configuration with examples

> This repository was created as reference for myself to learn nginx while going through [nginx beginner to advanced](https://www.udemy.com/nginx-beginner-to-advanced)

What follows is a bunch of code blocks with bits and pieces of `nginx.conf` complete with comments.
Fully working examples can be found in the folders *proxy* / *cache* / *proxy-with-cache*.

All examples can be run with `docker-compose` and build on the official nginx container.

**Resources**
 * [Nginx variables ref](http://nginx.org/en/docs/varindex.html)
 * [Nginx official container](https://hub.docker.com/_/nginx/)

## `nginx.conf` explained

> nginx has a master process that reads the configuration and creates worker processes to handle all the action

### the basics
```nginx
# the user that runs the worker processes
user nginx;

# set to number or auto = the number of cpu's available
worker_processes auto;

# the location of the master process pid
pid /var/run/nginx.pid
```

### events and http section

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

### Reverse Proxy

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

    # use keep-alive connections for backend, set to 10 minutes
    # requires us to set the http version in the location block below
    # works in a round robin fashion
    keepalive 600;
}

server {
    listen 80;
    server_name _;

    location / {
        # set http version to support keep-alive connections
        proxy_http_version 1.1;

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


### HTTP Caching of proxy responses

[Nginx caching guide](https://www.nginx.com/blog/nginx-caching-guide/)
[USING NGINX TO AVOID NODE.JS LOAD](http://blog.argteam.com/coding/hardening-node-js-for-production-part-2-using-nginx-to-avoid-node-js-load/)

Let nginx be your content cache (a server in between the client and the origin) and serve content without going to the backend server at all, especially good for offloading backend servers.
Also, nginx is amazingly fast at serving static files content from the local file system, much more so that for instance nodejs.

> Moreover, it supports the [sendfile](https://linux.die.net/man/2/sendfile) syscall to serve those files which is as fast as you can possibly get at serving files, since it's the OS kernel itself that's doing the job.
