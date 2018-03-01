import { MetadataStorage } from "../metadata/metadata-storage";

export function GraphQLArgsType(name?: string): ClassDecorator {
  return target => {
    MetadataStorage.registerArgsDefinition({
      name: name || target.name,
      target,
    });
  };
}

/**
 * @deprecated use GraphQLArgsType instead
 */
export function GraphQLArgumentType(name?: string): ClassDecorator {
  return GraphQLArgsType(name);
}