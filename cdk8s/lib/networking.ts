import {Construct} from "constructs";
import { Certificate } from "../imports/cert-manager.io";
import { KubeIngress } from "../imports/k8s";

interface LemmyNetworkingProps {
    hostname: string
    certManagerIssuer: {
        // Cert-manager issuer/clusterissuer you want to use to generate HTTPS certs.
        // See issuerRef block in https://cert-manager.io/docs/usage/certificate/
        group: "cert-manager.io" | string
        kind: "Issuer" | "ClusterIssuer" | string
        name: string
    }
    IngressClassName?: string  // Ingress Class to use for exposing our HTTP servers
    nginxServiceName: string  // Upstream Nginx service
}

export class LemmyNetworking extends Construct {
    constructor(scope: Construct, id: string, props: LemmyNetworkingProps) {
        super(scope, id);

        // constants
        const tlsSecretName = "lemmy-https-cert"

        // Declarations
        new Certificate(this, "cert", {
            spec: {
                secretName: tlsSecretName,
                issuerRef: props.certManagerIssuer,
                dnsNames: [props.hostname]
            }
        });

        new KubeIngress(this, "ingress", {
            spec: {
                ingressClassName: props.IngressClassName,
                rules: [
                    {
                        host: props.hostname,
                        http: {
                            paths: [
                                {
                                    path: "/",
                                    pathType: "Prefix",
                                    backend: {
                                        service: { name: props.nginxServiceName }
                                    }
                                }
                            ]
                        },
                    }
                ],
                tls: [
                    {
                        hosts: [props.hostname],
                        secretName: tlsSecretName
                    }
                ]
            },
            metadata: {
                annotations: {
                    // Nginx additional configuration
                    // HTTP2 is enabled by default https://github.com/kubernetes/ingress-nginx/issues/5983
                    // Websockets are enabled by default https://kubernetes.github.io/ingress-nginx/user-guide/miscellaneous/#websockets
                    // The following is configuration taken from https://github.com/LemmyNet/lemmy-ansible/blob/main/templates/nginx.conf
                    "nginx.ingress.kubernetes.io/configuration-snippet": `
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA256';
ssl_session_timeout  10m;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets on;
ssl_stapling on;
ssl_stapling_verify on;
server_tokens off;
gzip on;
gzip_types text/css application/javascript image/svg+xml;
gzip_vary on;
add_header Referrer-Policy "same-origin";
add_header X-Content-Type-Options "nosniff";
add_header X-Frame-Options "DENY";
add_header X-XSS-Protection "1; mode=block";
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header Host $host;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
`
                }
            }
        })
    }
}
