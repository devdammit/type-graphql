import "reflect-metadata";
import {
  IntrospectionSchema,
  IntrospectionInterfaceType,
  IntrospectionObjectType,
  IntrospectionNonNullTypeRef,
  IntrospectionNamedTypeRef,
  IntrospectionInputObjectType,
  GraphQLSchema,
  graphql,
  TypeKind,
} from "graphql";

import { getSchemaInfo } from "../helpers/getSchemaInfo";
import { getInnerFieldType } from "../helpers/getInnerFieldType";
import { getMetadataStorage } from "../../src/metadata/getMetadataStorage";
import { GeneratingSchemaError } from "../../src/errors";
import {
  InterfaceType,
  ObjectType,
  Field,
  ID,
  Query,
  ArgsType,
  Args,
  InputType,
  Arg,
  Mutation,
  buildSchema,
  Int,
} from "../../src";

describe("Interfaces and inheritance", () => {
  describe("Schema", () => {
    let schemaIntrospection: IntrospectionSchema;
    let queryType: IntrospectionObjectType;
    let sampleInterface1Type: IntrospectionInterfaceType;
    let sampleInterface2Type: IntrospectionInterfaceType;
    let sampleMultiImplementingObjectType: IntrospectionObjectType;
    let sampleExtendingImplementingObjectType: IntrospectionObjectType;
    let sampleImplementingObject1Type: IntrospectionObjectType;
    let sampleImplementingObject2Type: IntrospectionObjectType;
    let sampleExtendingObject2Type: IntrospectionObjectType;

    beforeAll(async () => {
      getMetadataStorage().clear();

      @InterfaceType()
      abstract class SampleInterface1 {
        @Field(type => ID)
        id: string;
        @Field() interfaceStringField1: string;
      }
      @InterfaceType()
      abstract class SampleInterface2 {
        @Field(type => ID)
        id: string;
        @Field() interfaceStringField2: string;
      }
      @InterfaceType()
      abstract class SampleInterfaceExtending1 extends SampleInterface1 {
        @Field() ownStringField1: string;
      }

      @ObjectType({ implements: SampleInterface1 })
      class SampleImplementingObject1 implements SampleInterface1 {
        id: string;
        interfaceStringField1: string;
        @Field() ownField1: number;
      }
      @ObjectType({ implements: SampleInterface1 })
      class SampleImplementingObject2 implements SampleInterface1 {
        @Field(type => ID)
        id: string;
        @Field() interfaceStringField1: string;
        @Field() ownField2: number;
      }
      @ObjectType({ implements: [SampleInterface1, SampleInterface2] })
      class SampleMultiImplementingObject implements SampleInterface1, SampleInterface2 {
        id: string;
        interfaceStringField1: string;
        interfaceStringField2: string;
        @Field() ownField3: number;
      }
      @ObjectType({ implements: SampleInterface1 })
      class SampleExtendingImplementingObject extends SampleImplementingObject2
        implements SampleInterface1 {
        @Field() ownField4: number;
      }
      @ObjectType()
      class SampleExtendingObject2 extends SampleImplementingObject2 {
        @Field() ownExtendingField2: number;
      }

      @ArgsType()
      class SampleBaseArgs {
        @Field() baseArgField: string;
      }
      @ArgsType()
      class SampleExtendingArgs extends SampleBaseArgs {
        @Field() extendingArgField: boolean;
      }

      @InputType()
      class SampleBaseInput {
        @Field() baseInputField: string;
      }
      @InputType()
      class SampleExtendingInput extends SampleBaseInput {
        @Field() extendingInputField: boolean;
      }

      class SampleResolver {
        @Query()
        sampleQuery(): boolean {
          return true;
        }

        @Query()
        queryWithArgs(@Args() args: SampleExtendingArgs): boolean {
          return true;
        }

        @Mutation()
        mutationWithInput(@Arg("input") input: SampleExtendingInput): boolean {
          return true;
        }
      }

      // get builded schema info from retrospection
      const schemaInfo = await getSchemaInfo({
        resolvers: [SampleResolver],
      });
      queryType = schemaInfo.queryType;
      schemaIntrospection = schemaInfo.schemaIntrospection;
      sampleInterface1Type = schemaIntrospection.types.find(
        type => type.name === "SampleInterface1",
      ) as IntrospectionInterfaceType;
      sampleInterface2Type = schemaIntrospection.types.find(
        type => type.name === "SampleInterface2",
      ) as IntrospectionInterfaceType;
      sampleImplementingObject1Type = schemaIntrospection.types.find(
        type => type.name === "SampleImplementingObject1",
      ) as IntrospectionObjectType;
      sampleImplementingObject2Type = schemaIntrospection.types.find(
        type => type.name === "SampleImplementingObject2",
      ) as IntrospectionObjectType;
      sampleExtendingImplementingObjectType = schemaIntrospection.types.find(
        type => type.name === "SampleExtendingImplementingObject",
      ) as IntrospectionObjectType;
      sampleMultiImplementingObjectType = schemaIntrospection.types.find(
        type => type.name === "SampleMultiImplementingObject",
      ) as IntrospectionObjectType;
      sampleExtendingObject2Type = schemaIntrospection.types.find(
        type => type.name === "SampleExtendingObject2",
      ) as IntrospectionObjectType;
    });

    // helpers
    function getInnerType(fieldType: any) {
      return (fieldType.type as IntrospectionNonNullTypeRef).ofType! as IntrospectionNamedTypeRef;
    }

    it("should generate schema without errors", async () => {
      expect(schemaIntrospection).toBeDefined();
    });

    it("should generate interface type correctly", async () => {
      expect(sampleInterface1Type).toBeDefined();
      expect(sampleInterface1Type.kind).toEqual(TypeKind.INTERFACE);
      expect(sampleInterface1Type.fields).toHaveLength(2);

      const idFieldType = getInnerFieldType(sampleInterface1Type, "id");
      const interfaceStringField = getInnerFieldType(sampleInterface1Type, "interfaceStringField1");

      expect(idFieldType.name).toEqual("ID");
      expect(interfaceStringField.name).toEqual("String");
    });

    it("should generate type of interface extending other interface correctly", async () => {
      const sampleInterfaceExtending1 = schemaIntrospection.types.find(
        type => type.name === "SampleInterfaceExtending1",
      ) as IntrospectionInterfaceType;
      expect(sampleInterfaceExtending1).toBeDefined();
      expect(sampleInterfaceExtending1.kind).toEqual(TypeKind.INTERFACE);
      expect(sampleInterfaceExtending1.fields).toHaveLength(3);

      const idFieldType = getInnerFieldType(sampleInterfaceExtending1, "id");
      const interfaceStringField = getInnerFieldType(
        sampleInterfaceExtending1,
        "interfaceStringField1",
      );
      const ownStringField1 = getInnerFieldType(sampleInterfaceExtending1, "ownStringField1");

      expect(idFieldType.name).toEqual("ID");
      expect(interfaceStringField.name).toEqual("String");
      expect(ownStringField1.name).toEqual("String");
    });

    it("should generate object type explicitly implementing interface correctly", async () => {
      expect(sampleImplementingObject2Type).toBeDefined();
      expect(sampleImplementingObject2Type.fields).toHaveLength(3);

      const idFieldType = getInnerFieldType(sampleImplementingObject2Type, "id");
      const interfaceStringField = getInnerFieldType(
        sampleImplementingObject2Type,
        "interfaceStringField1",
      );
      const ownField2 = getInnerFieldType(sampleImplementingObject2Type, "ownField2");
      const implementedInterfaceInfo = sampleImplementingObject2Type.interfaces.find(
        it => it.name === "SampleInterface1",
      )!;

      expect(idFieldType.name).toEqual("ID");
      expect(interfaceStringField.name).toEqual("String");
      expect(ownField2.name).toEqual("Float");
      expect(implementedInterfaceInfo.kind).toEqual(TypeKind.INTERFACE);
    });

    it("should generate object type implicitly implementing interface correctly", async () => {
      expect(sampleImplementingObject1Type).toBeDefined();
      expect(sampleImplementingObject1Type.fields).toHaveLength(3);

      const idFieldType = getInnerFieldType(sampleImplementingObject1Type, "id");
      const interfaceStringField1 = getInnerFieldType(
        sampleImplementingObject1Type,
        "interfaceStringField1",
      );
      const ownField1 = getInnerFieldType(sampleImplementingObject1Type, "ownField1");
      const implementedInterfaceInfo = sampleImplementingObject2Type.interfaces.find(
        it => it.name === "SampleInterface1",
      )!;

      expect(idFieldType.name).toEqual("ID");
      expect(interfaceStringField1.name).toEqual("String");
      expect(ownField1.name).toEqual("Float");
      expect(implementedInterfaceInfo.kind).toEqual(TypeKind.INTERFACE);
    });

    it("should generate object type extending other object type correctly", async () => {
      expect(sampleExtendingObject2Type).toBeDefined();
      expect(sampleExtendingObject2Type.fields).toHaveLength(4);

      const idFieldType = getInnerFieldType(sampleExtendingObject2Type, "id");
      const interfaceStringField1 = getInnerFieldType(
        sampleExtendingObject2Type,
        "interfaceStringField1",
      );
      const ownField2 = getInnerFieldType(sampleExtendingObject2Type, "ownField2");
      const ownExtendingField2 = getInnerFieldType(
        sampleExtendingObject2Type,
        "ownExtendingField2",
      );

      expect(idFieldType.name).toEqual("ID");
      expect(interfaceStringField1.name).toEqual("String");
      expect(ownField2.name).toEqual("Float");
      expect(ownExtendingField2.name).toEqual("Float");
    });

    // tslint:disable-next-line:max-line-length
    it("should generate object type implementing interface when extending object type", async () => {
      expect(sampleExtendingObject2Type).toBeDefined();

      const implementedInterfaceInfo = sampleExtendingObject2Type.interfaces.find(
        it => it.name === "SampleInterface1",
      )!;

      expect(implementedInterfaceInfo).toBeDefined();
      expect(implementedInterfaceInfo.kind).toEqual(TypeKind.INTERFACE);
    });

    // tslint:disable-next-line:max-line-length
    it("should generate object type implicitly implementing mutliple interfaces correctly", async () => {
      expect(sampleMultiImplementingObjectType).toBeDefined();
      expect(sampleMultiImplementingObjectType.fields).toHaveLength(4);

      const idFieldType = getInnerFieldType(sampleMultiImplementingObjectType, "id");
      const interfaceStringField1 = getInnerFieldType(
        sampleMultiImplementingObjectType,
        "interfaceStringField1",
      );
      const interfaceStringField2 = getInnerFieldType(
        sampleMultiImplementingObjectType,
        "interfaceStringField2",
      );
      const ownField3 = getInnerFieldType(sampleMultiImplementingObjectType, "ownField3");

      expect(idFieldType.name).toEqual("ID");
      expect(interfaceStringField1.name).toEqual("String");
      expect(interfaceStringField2.name).toEqual("String");
      expect(ownField3.name).toEqual("Float");
    });

    it("should generate object type implicitly implementing and extending correctly", async () => {
      expect(sampleExtendingImplementingObjectType).toBeDefined();
      expect(sampleExtendingImplementingObjectType.fields).toHaveLength(4);

      const idFieldType = getInnerFieldType(sampleExtendingImplementingObjectType, "id");
      const interfaceStringField1 = getInnerFieldType(
        sampleExtendingImplementingObjectType,
        "interfaceStringField1",
      );
      const ownField2 = getInnerFieldType(sampleExtendingImplementingObjectType, "ownField2");
      const ownField4 = getInnerFieldType(sampleExtendingImplementingObjectType, "ownField4");

      expect(idFieldType.name).toEqual("ID");
      expect(interfaceStringField1.name).toEqual("String");
      expect(ownField2.name).toEqual("Float");
      expect(ownField4.name).toEqual("Float");
    });

    it("should generate query args when extending other args class", async () => {
      const queryWithArgs = queryType.fields.find(query => query.name === "queryWithArgs")!;
      expect(queryWithArgs.args).toHaveLength(2);

      const baseArgFieldType = getInnerType(
        queryWithArgs.args.find(arg => arg.name === "baseArgField")!,
      );
      const extendingArgFieldType = getInnerType(
        queryWithArgs.args.find(arg => arg.name === "extendingArgField")!,
      );

      expect(baseArgFieldType.name).toEqual("String");
      expect(extendingArgFieldType.name).toEqual("Boolean");
    });

    it("should generate mutation input when extending other args class", async () => {
      const sampleExtendingInputType = schemaIntrospection.types.find(
        type => type.name === "SampleExtendingInput",
      ) as IntrospectionInputObjectType;
      const baseInputFieldType = getInnerType(
        sampleExtendingInputType.inputFields.find(field => field.name === "baseInputField")!,
      );
      const extendingInputFieldType = getInnerType(
        sampleExtendingInputType.inputFields.find(field => field.name === "extendingInputField")!,
      );

      expect(baseInputFieldType.name).toEqual("String");
      expect(extendingInputFieldType.name).toEqual("Boolean");
    });
  });

  describe("Errors", () => {
    beforeEach(() => {
      getMetadataStorage().clear();
    });

    it("should throw error when extending wrong class type", async () => {
      expect.assertions(1);
      try {
        @InputType()
        class SampleInput {
          @Field() inputField: string;
        }
        @ArgsType()
        class SampleArgs extends SampleInput {
          @Field() argField: string;
        }
        class SampleResolver {
          @Query()
          sampleQuery(@Args() args: SampleArgs): boolean {
            return true;
          }
        }
        await buildSchema({
          resolvers: [SampleResolver],
        });
      } catch (err) {
        // TODO: test for more meaningfull error message
        expect(err).toBeDefined();
      }
    });

    it("should throw error when field type doesn't match with interface", async () => {
      expect.assertions(4);
      try {
        @InterfaceType()
        class IBase {
          @Field() baseField: string;
        }
        @ObjectType({ implements: IBase })
        class ChildObject implements IBase {
          @Field(type => Number, { nullable: true })
          baseField: string;
          @Field() argField: string;
        }
        class SampleResolver {
          @Query()
          sampleQuery(): ChildObject {
            return {} as ChildObject;
          }
        }
        await buildSchema({
          resolvers: [SampleResolver],
        });
      } catch (err) {
        expect(err).toBeInstanceOf(GeneratingSchemaError);
        const schemaError = err as GeneratingSchemaError;
        const errMessage = schemaError.details[0].message;
        expect(errMessage).toContain("IBase");
        expect(errMessage).toContain("ChildObject");
        expect(errMessage).toContain("baseField");
      }
    });
  });

  describe("Functional", () => {
    let schema: GraphQLSchema;
    let queryArgs: any;
    let mutationInput: any;

    beforeEach(() => {
      queryArgs = undefined;
      mutationInput = undefined;
    });

    beforeAll(async () => {
      getMetadataStorage().clear();

      @ArgsType()
      class BaseArgs {
        @Field() baseArgField: string;
        @Field(type => Int, { nullable: true })
        optionalBaseArgField: number = 255;
      }
      @ArgsType()
      class ChildArgs extends BaseArgs {
        @Field() childArgField: string;
      }

      @InputType()
      class BaseInput {
        @Field() baseInputField: string;
        @Field(type => Int, { nullable: true })
        optionalBaseInputField: number = 255;
      }
      @InputType()
      class ChildInput extends BaseInput {
        @Field() childInputField: string;
      }

      @InterfaceType()
      abstract class BaseInterface {
        @Field() baseInterfaceField: string;
      }

      @ObjectType({ implements: BaseInterface })
      class FirstImplementation implements BaseInterface {
        baseInterfaceField: string;
        @Field() firstField: string;
      }
      @ObjectType({ implements: BaseInterface })
      class SecondImplementation implements BaseInterface {
        baseInterfaceField: string;
        @Field() secondField: string;
      }

      class SampleBaseClass {
        static sampleStaticMethod() {
          return "sampleStaticMethod";
        }
      }

      @ObjectType()
      class SampleExtendingNormalClassObject extends SampleBaseClass {
        @Field() sampleField: string;
      }

      class InterfacesResolver {
        @Query()
        getInterfacePlainObject(): BaseInterface {
          return {} as FirstImplementation;
        }

        @Query()
        getFirstInterfaceImplementationObject(): BaseInterface {
          const obj = new FirstImplementation();
          obj.baseInterfaceField = "baseInterfaceField";
          obj.firstField = "firstField";
          return obj;
        }

        @Query()
        queryWithArgs(@Args() args: ChildArgs): boolean {
          queryArgs = args;
          return true;
        }
        @Mutation()
        mutationWithInput(@Arg("input") input: ChildInput): boolean {
          mutationInput = input;
          return true;
        }

        @Query()
        baseClassQuery(): string {
          return SampleExtendingNormalClassObject.sampleStaticMethod();
        }
      }

      schema = await buildSchema({
        resolvers: [InterfacesResolver],
      });
    });

    it("should return interface type fields data", async () => {
      const query = `query {
        getFirstInterfaceImplementationObject {
          baseInterfaceField
        }
      }`;

      const result = await graphql(schema, query);
      const data = result.data!.getFirstInterfaceImplementationObject;
      expect(data.baseInterfaceField).toEqual("baseInterfaceField");
    });

    it("should correctly recognize returned object type on query returning interface", async () => {
      const query = `query {
        getFirstInterfaceImplementationObject {
          baseInterfaceField
          ... on SecondImplementation {
            secondField
          }
        }
      }`;

      const result = await graphql(schema, query);
      const data = result.data!.getFirstInterfaceImplementationObject;
      expect(data.baseInterfaceField).toEqual("baseInterfaceField");
      expect(data.secondField).toBeUndefined();
    });

    it("should throw error when not returning instance of object class", async () => {
      const query = `query {
        getInterfacePlainObject {
          baseInterfaceField
        }
      }`;

      const result = await graphql(schema, query);

      expect(result.data).toBeNull();
      expect(result.errors).toHaveLength(1);

      const error = result.errors![0];
      expect(error.message).toContain("BaseInterface");
      expect(error.message).toContain("getInterfacePlainObject");
      expect(error.message).toContain("resolveType");
      expect(error.message).toContain("isTypeOf");
    });

    it("should return fields data of object type implementing interface", async () => {
      const query = `query {
        getFirstInterfaceImplementationObject {
          baseInterfaceField
          ... on FirstImplementation {
            firstField
          }
        }
      }`;

      const result = await graphql(schema, query);
      const data = result.data!.getFirstInterfaceImplementationObject;
      expect(data.baseInterfaceField).toEqual("baseInterfaceField");
      expect(data.firstField).toEqual("firstField");
    });

    it("should pass args data of extended args class", async () => {
      const query = `query {
        queryWithArgs(
          baseArgField: "baseArgField"
          childArgField: "childArgField"
        )
      }`;

      await graphql(schema, query);

      expect(queryArgs.baseArgField).toEqual("baseArgField");
      expect(queryArgs.childArgField).toEqual("childArgField");
      expect(queryArgs.optionalBaseArgField).toEqual(255);
    });

    it("should pass input data of extended input class", async () => {
      const query = `mutation {
        mutationWithInput(input: {
          baseInputField: "baseInputField"
          childInputField: "childInputField"
        })
      }`;

      await graphql(schema, query);

      expect(mutationInput.baseInputField).toEqual("baseInputField");
      expect(mutationInput.childInputField).toEqual("childInputField");
      expect(mutationInput.optionalBaseInputField).toEqual(255);
    });

    it("should correctly extends non-TypeGraphQL class", async () => {
      const query = `query {
        baseClassQuery
      }`;

      const { data } = await graphql(schema, query);

      expect(data!.baseClassQuery).toEqual("sampleStaticMethod");
    });
  });
});
