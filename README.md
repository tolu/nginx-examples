# nginx-examples
Explainer for nginx configuration with examples

What follows is a bunch of code blocks with bits and pieces of nginx.conf complete with comments.
Fully working examples can be found in the folders *proxy* / *cache* / *proxy-with-cache*.

All examples can be run with `docker-compose` and build on the official nginx container.

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


```nginx
events {
    # set max nr of connections for each worker
    worker_connection 1024;
}

http {
    # create named log format
    log_format main '$remote_addr - $remote_user - [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    # specify output for logs and named log format
    access_log /var/log/nginx/access.log main;

    # print logs on standard out
    access_log /dev/stdout main;
}
```
