import {PostgresqlSpecResources} from "./imports/acid.zalan.do";
import {Size} from "cdk8s";
import {ContainerResources} from "cdk8s-plus-26/lib/container";

/**
 * Size presets for the various lemmy containers.
 * These are currently rough estimates and haven't been tested. If these end up too big or too small, please leave feedback.
 * solo:   ~1-5 users per container
 * micro:  ~10-20 users per container
 * small:  ~50-100 users per container
 * medium: ~200-400 users per container
 * large:  ~1000-2000 users per container
 * xlarge: ~5000-10000 users per container
 */
export type ContainerSize = "solo" | "micro" | "small" | "medium" | "large" | "xlarge"

/**  Variables to create a custom container size */
export interface CustomContainerSize {
    cpuRequest: string
    memoryLimit: Size
}

export interface LemmyContainerSizePreset {
    solo: CustomContainerSize
    micro: CustomContainerSize
    small: CustomContainerSize
    medium: CustomContainerSize
    large: CustomContainerSize
    xlarge: CustomContainerSize
}
export interface LemmyContainerSizePresets {
    backend: LemmyContainerSizePreset
    ui: LemmyContainerSizePreset
    pictrs: LemmyContainerSizePreset
    database: LemmyContainerSizePreset
}

export const lemmyContainerSizePreset: LemmyContainerSizePresets = {
    backend: {
        solo:   {cpuRequest: "20m",  memoryLimit: Size.mebibytes(100)},
        micro:  {cpuRequest: "50m",  memoryLimit: Size.mebibytes(100)},
        small:  {cpuRequest: "200m", memoryLimit: Size.mebibytes(200)},
        medium: {cpuRequest: "500m", memoryLimit: Size.mebibytes(400)},
        large:  {cpuRequest: "1",    memoryLimit: Size.gibibytes(1)  },
        xlarge: {cpuRequest: "2",    memoryLimit: Size.gibibytes(2)  },
    },
    ui: {
        solo:   {cpuRequest: "10m",  memoryLimit: Size.mebibytes(200)},
        micro:  {cpuRequest: "50m",  memoryLimit: Size.mebibytes(200)},
        small:  {cpuRequest: "100m", memoryLimit: Size.mebibytes(300)},
        medium: {cpuRequest: "500m", memoryLimit: Size.mebibytes(500)},
        large:  {cpuRequest: "1",    memoryLimit: Size.gibibytes(1)  },
        xlarge: {cpuRequest: "2",    memoryLimit: Size.gibibytes(4)  },
    },
    pictrs: {
        solo:   {cpuRequest: "20m",  memoryLimit: Size.mebibytes(100)},
        micro:  {cpuRequest: "50m",  memoryLimit: Size.mebibytes(100)},
        small:  {cpuRequest: "200m", memoryLimit: Size.mebibytes(200)},
        medium: {cpuRequest: "500m", memoryLimit: Size.mebibytes(400)},
        large:  {cpuRequest: "1",    memoryLimit: Size.gibibytes(1)  },
        xlarge: {cpuRequest: "2",    memoryLimit: Size.gibibytes(2)  },
    },
    database: {
        solo:   {cpuRequest: "50m",  memoryLimit: Size.gibibytes(1)},
        micro:  {cpuRequest: "100m", memoryLimit: Size.gibibytes(1)},
        small:  {cpuRequest: "200m", memoryLimit: Size.gibibytes(2)},
        medium: {cpuRequest: "500m", memoryLimit: Size.gibibytes(4)},
        large:  {cpuRequest: "1",    memoryLimit: Size.gibibytes(6)},
        xlarge: {cpuRequest: "2",    memoryLimit: Size.gibibytes(8)},
    }
}

export type ResourceSetting = ContainerSize | CustomContainerSize

export const getResourceBlockPresetString = (service: keyof LemmyContainerSizePresets,
                                             size: ContainerSize): PostgresqlSpecResources => {
    return {
        requests: {
            cpu: lemmyContainerSizePreset[service][size].cpuRequest
        },
        limits: {
            memory: lemmyContainerSizePreset[service][size].memoryLimit.toMebibytes().toString() + 'Mi'
        }
    }
}
export const getResourceBlockPresetKPlus = (service: keyof LemmyContainerSizePresets,
                                            size: ContainerSize): ContainerResources => {
    return {
        cpu: {
            request: { amount: lemmyContainerSizePreset[service][size].cpuRequest }
        },
        memory: {
            limit: lemmyContainerSizePreset[service][size].memoryLimit
        }
    }
}
export const getCustomResourceBlockString = (size: CustomContainerSize): PostgresqlSpecResources => {
    return {
        requests: {
            cpu: size.cpuRequest
        },
        limits: {
            memory: size.memoryLimit.toMebibytes().toString() + 'Mi'
        }
    }
}
export const getCustomResourceBlockKPlus = (size: CustomContainerSize): ContainerResources => {
    return {
        cpu: {
            request:  { amount: size.cpuRequest }
        },
        memory: {
            limit: size.memoryLimit
        }
    }
}
export const getResourceBlockString = (setting: ResourceSetting, service: keyof LemmyContainerSizePresets): PostgresqlSpecResources => {
    if(typeof setting === 'string')
        return getResourceBlockPresetString(service, setting);
    else
        return getCustomResourceBlockString(setting);
}
export const getResourceBlockKPlus = (setting: ResourceSetting, service: keyof LemmyContainerSizePresets): ContainerResources => {
    if(typeof setting === 'string')
        return getResourceBlockPresetKPlus(service, setting);
    else
        return getCustomResourceBlockKPlus(setting);
}
