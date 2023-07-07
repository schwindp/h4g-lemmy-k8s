import {Construct} from "constructs";

import * as kplus from 'cdk8s-plus-26';

import {containerSecurityContext} from './security';
import {Size} from "cdk8s";

interface LemmyNginxProps {
    backendServiceName: string  // Upstream lemmy backend service
    uiServiceName: string  // Upstream lemmy-ui service
    nginxServiceName: string; // Name for Nginx service
}

export class LemmyNginx extends Construct {
    constructor(scope: Construct, id: string, props: LemmyNginxProps) {
        super(scope, id);

        // Template nginx config
        const nginxConfig = `
# Adapted from https://github.com/LemmyNet/lemmy-ansible/blob/main/templates/nginx_internal.conf

worker_processes auto;
events {
    worker_connections 1024;
}
http {
    upstream lemmy {
        # this needs to map to the lemmy (server) docker service hostname
        server "${props.backendServiceName}:8536";
    }
    upstream lemmy-ui {
        # this needs to map to the lemmy-ui docker service hostname
        server "${props.uiServiceName}:1234";
    }

    server {
        listen 8080;
        
        # Upload limit, relevant for pictrs
        client_max_body_size 20M;

        add_header X-Frame-Options SAMEORIGIN;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        # frontend general requests
        location / {
            # distinguish between ui requests and backend
            # don't change lemmy-ui or lemmy here, they refer to the upstream definitions on top
            set $proxpass "http://lemmy-ui";

            if ($http_accept = "application/activity+json") {
              set $proxpass "http://lemmy";
            }
            if ($http_accept = "application/ld+json; profile=\\"https://www.w3.org/ns/activitystreams\\"") {
              set $proxpass "http://lemmy";
            }
            if ($request_method = POST) {
              set $proxpass "http://lemmy";
            }
            proxy_pass $proxpass;

            rewrite ^(.+)/+$ $1 permanent;
            # Send actual client IP upstream
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # backend
        location ~ ^/(api|pictrs|feeds|nodeinfo|.well-known) {
            proxy_pass "http://lemmy";
            # proxy common stuff
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # Send actual client IP upstream
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
`
        // Declarations
        const nginxCM = new kplus.ConfigMap(this, "nginx.conf", {
            data: {
                "lemmy.conf" : nginxConfig
            }
        })
        const configVolume = kplus.Volume.fromConfigMap(this, 'ConfigMap', nginxCM);

        const deployment = new kplus.Deployment(this, "nginx",{
            replicas: 1,
        })
        const container = deployment.addContainer({
            image: "cgr.dev/chainguard/nginx:1.25",
            ports: [{ number: 8080, name: "http" }],
            securityContext: containerSecurityContext,
            volumeMounts: [  // make tmp and /var/run rw
                {path: "/var/lib/nginx/tmp", volume: kplus.Volume.fromEmptyDir(this, "tmp", "tmp")},
                {path: "/var/run", volume: kplus.Volume.fromEmptyDir(this, "varrun", "varrun")}
            ],
            resources: {
                cpu: {
                    request: {amount: "50m"}
                },
                memory:{
                    limit: Size.mebibytes(50)
                },
            }
        })
        container.mount("/etc/nginx/conf.d/", configVolume)

        deployment.exposeViaService({ name: props.nginxServiceName })
    }

}
