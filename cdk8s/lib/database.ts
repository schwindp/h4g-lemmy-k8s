import {Construct} from "constructs";

import {KubeConfigMap} from "../imports/k8s";
import {
    Postgresql,
    PostgresqlSpecNodeAffinity,
    PostgresqlSpecPostgresqlVersion, PostgresqlSpecTolerations,
    PostgresqlSpecUsers, PostgresqlSpecVolume
} from "../imports/acid.zalan.do";
import {
    ContainerSize,
    CustomContainerSize,
    getResourceBlockString,

} from "../lemmy-container-sizes";

// Fix type weirdness https://stackoverflow.com/a/46634877
type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export interface LemmyDatabaseProps {
    numberOfInstances?: number  // How many database servers to run. There can only be one primary, but running 2 instances so that you have a secondary is good for HA.
    containerSize?: ContainerSize | CustomContainerSize
    enableConnectionPooling?: boolean  // Whether to use the built-in PgBouncer pooler. Defaults to false.
    storage?: {  // Configuration for the database cluster's Persistent Volumes.
        size?: string  // Size to create the PV with. Defaults to 1Gi. Does nothing on some storage types.
        storageClass?: string // StorageClass to create the PV with
    }
    backups: {  // Based on info from https://thedatabaseme.de/2022/03/26/backup-to-s3-configure-zalando-postgres-operator-backup-with-wal-g/
        s3Endpoint: string
        bucketName: string
        usePathStyle?: boolean // whether to use S3 path style or virtual hosted style. minio.home.lab:9000/<WAL_S3_BUCKET>/ vs. <WAL_S3_BUCKET>.minio.home.lab:9000/
        disableSSE?: boolean // Disables server side encryption and allows you to see the files on the S3/B2/R2 web GUI
        backupCron?: string // Defaults to every day at 6AM UTC
    }
    nodeAffinity?: PostgresqlSpecNodeAffinity
    tolerations?: PostgresqlSpecTolerations[]
}

export class LemmyDatabase extends Construct {
    constructor(scope: Construct, id: string, props: LemmyDatabaseProps) {
        super(scope, id);


        // Default values
        const numberOfInstances = props.numberOfInstances || 1;
        const containerSize = props.containerSize || "solo";
        const enableConnectionPooling = props.enableConnectionPooling || false;

        let volume: Writeable<PostgresqlSpecVolume> = { size: "1GiB" }
        if(props.storage) {
            volume.size = props.storage.size || "1GiB";
            volume.storageClass = props.storage.storageClass || undefined;
        }

        const backups_usePathStyle = props.backups.usePathStyle || false;
        const backups_disableSSE = props.backups.disableSSE || false;
        const backups_backupCron = props.backups.backupCron || "0 6 * * *";

        const nodeAffinity: PostgresqlSpecNodeAffinity = props.nodeAffinity || {};
        const tolerations: PostgresqlSpecTolerations[] = props.tolerations || [];


        // Declarations
        new KubeConfigMap(this, "pgbk-s3-config", {
            metadata: {
                name: "pgbk-s3-config"
            },
            data: {
                WAL_S3_BUCKET: props.backups.bucketName,
                AWS_ENDPOINT: props.backups.s3Endpoint,
                AWS_S3_FORCE_PATH_STYLE: backups_usePathStyle.toString(),
                WALG_DISABLE_S3_SSE: backups_disableSSE.toString(),
                BACKUP_SCHEDULE: backups_backupCron,

                USE_WALG_BACKUP: "true",
                USE_WALG_RESTORE: "true",
                WAL_BUCKET_SCOPE_PREFIX: "",
                WAL_BUCKET_SCOPE_SUFFIX: "",
                BACKUP_NUM_TO_RETAIN: "1"
            }
        });

        new Postgresql(this, 'db', {
            spec: {
                teamId: "lemmy",  // Not really used, just boilerplate https://postgres-operator.readthedocs.io/en/latest/user/#create-a-manifest-for-a-new-postgresql-cluster
                numberOfInstances: numberOfInstances,
                enableConnectionPooler: enableConnectionPooling,
                enableReplicaConnectionPooler: enableConnectionPooling,
                users: {
                    admin: [ // database owner
                        PostgresqlSpecUsers.SUPERUSER,
                        PostgresqlSpecUsers.CREATEDB
                    ],
                    lemmy: []  // lemmy db user
                },
                databases: {
                    lemmy: "lemmy"  // key is dbname, value string is owner
                },
                postgresql: {
                    version: PostgresqlSpecPostgresqlVersion.VALUE_15
                },
                volume: volume,
                resources: getResourceBlockString(containerSize, "database"),
                nodeAffinity: nodeAffinity,
                tolerations: tolerations
            }
        });
    }
}
