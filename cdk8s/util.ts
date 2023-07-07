import {
    ContainerSize,
    CustomContainerSize, getCustomResourceBlockQuantity,
    getResourceBlockPresetQuantity,
    LemmyContainerSizePresets
} from "./lemmy-container-sizes";
import {KubeDeployment, NodeAffinity, Scheduling, Toleration} from "./imports/k8s";
import {JsonPatch} from "cdk8s";

/** Common values that can be set on any Deployment in LemmyChart */
export interface DeploymentValues {
    image?: string  // you could set latest here, but you shouldn't.
    containerSize?: ContainerSize | CustomContainerSize
    replicas?: number
    nodeSelector?: Scheduling["nodeSelector"]
    nodeAffinity?: NodeAffinity
    tolerations?: Toleration[]
}

/**
 * Template-y function for setting DeploymentValues on deployments we're generating
 * @param deployment
 * @param service
 * @param values
 */
export const setOptionalDeploymentValues = (deployment: KubeDeployment,
                                            service:  keyof LemmyContainerSizePresets,
                                            values: DeploymentValues) => {
    if(values.image)
        deployment.addJsonPatch(
            JsonPatch.replace('/spec/template/spec/containers[0]/image',values.image)
        );
    if(values.containerSize)
        if(typeof values.containerSize === 'string') {
            deployment.addJsonPatch(
                JsonPatch.replace(
                    '/spec/template/spec/containers[0]/resources',
                    getResourceBlockPresetQuantity(service, values.containerSize)
                )
            );
        } else {
            deployment.addJsonPatch(
                JsonPatch.replace(
                    '/spec/template/spec/containers[0]/resources',
                    getCustomResourceBlockQuantity(values.containerSize)
                )
            );
        }
    if(values.replicas)
        deployment.addJsonPatch(
            JsonPatch.replace('/spec/replicas',values.replicas)
        );
    if(values.nodeSelector)
        deployment.addJsonPatch(
            JsonPatch.replace('/spec/template/spec/NodeSelector',values.nodeSelector)
        );
    if(values.nodeAffinity)
        deployment.addJsonPatch(
            JsonPatch.replace('/spec/template/spec/affinity/nodeAffinity', values.nodeAffinity)
        );
    if(values.tolerations)
        deployment.addJsonPatch(
            JsonPatch.replace('/spec/template/spec/tolerations', values.tolerations)
        );
}