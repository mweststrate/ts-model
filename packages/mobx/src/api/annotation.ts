import {
    ObservableObjectAdministration,
    isGenerator,
    isFunction,
    autoAction,
    isAction,
    flow,
    computed,
    isFlow
} from "../internal"

export type Annotation = {
    annotationType_: string
    make_(adm: ObservableObjectAdministration, key: PropertyKey): boolean
    extend_(
        adm: ObservableObjectAdministration,
        key: PropertyKey,
        descriptor: PropertyDescriptor,
        proxyTrap: boolean
    ): boolean
    options_?: any
    isDecorator_?: boolean
}

export type AnnotationMapEntry =
    | Annotation
    | true /* follow the default decorator, usually deep */
    | false /* don't decorate this property */

// AdditionalFields can be used to declare additional keys that can be used, for example to be able to
// declare annotations for private/ protected members, see #2339
export type AnnotationsMap<T, AdditionalFields extends PropertyKey> = {
    [P in Exclude<keyof T, "toString">]?: AnnotationMapEntry
} &
    Record<AdditionalFields, AnnotationMapEntry>

export function inferAnnotationFromDescriptor(
    desc: PropertyDescriptor,
    defaultAnnotation: Annotation,
    autoBind: boolean
): Annotation | false {
    if (desc.get) return computed
    if (desc.set) return false // ignore setter w/o getter
    // if already wrapped in action/flow, don't do that another time, but assume it is already set up properly
    return isFunction(desc.value)
        ? isGenerator(desc.value)
            ? isFlow(desc.value)
                ? false
                : flow
            : isAction(desc.value)
            ? false
            : autoBind
            ? autoAction.bound
            : autoAction
        : defaultAnnotation
}

export function isAnnotation(thing: any) {
    return (
        // Can be function
        thing instanceof Object &&
        typeof thing.annotationType_ === "string" &&
        isFunction(thing.make_) &&
        isFunction(thing.extend_)
    )
}

export function isAnnotationMapEntry(thing: any) {
    return typeof thing === "boolean" || isAnnotation(thing)
}
