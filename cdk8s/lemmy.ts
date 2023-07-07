import { Construct } from 'constructs';
import { Chart, ChartProps } from 'cdk8s';

import {DeploymentValues} from "./util";
import {LemmyDatabase, LemmyDatabaseProps} from "./lib/database";
import {LemmyNginx} from "./lib/nginx";
import {LemmyNetworking} from "./lib/networking";



/** Parameters akin to Helm's values.yaml that are used to generate the kubernetes configuration. */
export interface LemmyProps extends ChartProps {
    hostname: string  // hostname for your lemmy instance (e.g. lemmy.world)

    certManagerIssuer: {
        // Cert-manager issuer/clusterissuer you want to use to generate HTTPS certs.
        // See issuerRef block in https://cert-manager.io/docs/usage/certificate/
        group: "cert-manager.io" | string
        kind: "Issuer" | "ClusterIssuer" | string
        name: string
    }
    IngressClassName?: string  // Ingress Class to use for terminating TLS
    database: LemmyDatabaseProps
    pictRsBucket: {
        // S3-compatible bucket to use for storing uploaded pictures
        // See https://git.asonix.dog/asonix/pict-rs/src/commit/e139765e6d9de9cffabc1250e6e58e356816fada/pict-rs.toml#L262
        endpoint: string
        use_path_style: boolean
        bucket_name: string
        region: string
        // Secret with the fields "access_key" and "secret_key" for authenticating to S3, reuses Zalando's pgbk-s3-credentials secret by default.
        access_secret_name?: string
    }
    // pictrs bucket config
    lemmyDotHJSON?: {
        email?: {
            smtp_server: string  // Hostname and port of the smtp server
            smtp_creds_secret?: string  // Name of secret containing the keys "username" and "password" for smtp auth
            smtp_from_address: string  // Address to send emails from, eg "noreply@your-instance.com"
            tls_type: string  // Whether or not smtp connections should use tls. Can be none, tls, or starttls
        }
    }
    rustLog?: string // RUST_LOG environment variable to set on lemmy backend and pict-rs containers (defaults to "warn")
    opentelemetryCollectorURL?: string  // Opentelemetry URL to send logs and performance traces to. (See https://github.com/LemmyNet/lemmy/issues/1823)
    lemmyBackendPod?: DeploymentValues
    lemmyUIPod?: DeploymentValues
    pictRSPod?: DeploymentValues
}

export class LemmyChart extends Chart {
    constructor(scope: Construct, id: string, props: LemmyProps) {
        super(scope, id, props)

        // constants
        const backendServiceName = "lemmy-backend"
        const uiServiceName = "lemmy-ui"
        // const pictrsServiceName = "pict-rs"
        const nginxServiceName = "lemmy-internal-nginx"


        // // init container on lemmy backend pod that builds lemmy.hsjon using mounted configmaps and secrets
        // const hjson_builder: Container = {
        //
        // }
        //
        // const backend = new KubeDeployment(this, 'backend', {
        //     spec: {
        //         template: {
        //             spec: {
        //                 containers: [
        //                     {
        //                         name: "lemmy",
        //                         resources: getResourceBlockPresetQuantity("database", "solo")
        //                     }
        //                 ]
        //             }
        //         }
        //     }
        // });
        // if(values.lemmyBackendPod) setOptionalDeploymentValues(backend, "backend", values.lemmyBackendPod);
        //

        // Create child Constructs
        new LemmyDatabase(this, "db", props.database);
        new LemmyNginx(this, "nginx", {
            backendServiceName: backendServiceName,
            uiServiceName: uiServiceName,
            nginxServiceName: nginxServiceName
        })
        new LemmyNetworking(this, "networking", {
            hostname: props.hostname,
            certManagerIssuer: props.certManagerIssuer,
            IngressClassName: props.IngressClassName,
            nginxServiceName: nginxServiceName
        })

    }
}
