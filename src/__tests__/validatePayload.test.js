import { Types } from "../structure";
import {
  validateValue,
  validateShape,
  validateArray,
  getTypeValidation,
  hasWildcardKey,
  getValueType
} from "../validatePayload";

describe("Validation functionality", () => {
  describe("Primitives/Custom", () => {
    const customType = Types.custom({
      validator: value => value === 3,
      validationErrorMessage: value => `Oh noes! ${value}`
    })();

    it("Number primitive should allow for numbers", () => {
      expect(validateValue(Types.number(), 3)).toBe(3);
    });
    it("String primitive should allow for string", () => {
      expect(validateValue(Types.string(), "toast")).toBe("toast");
    });
    it("Boolean primitive should allow for string", () => {
      expect(validateValue(Types.boolean(), true)).toBe(true);
    });
    it("Any should allow for anything", () => {
      const date = new Date();
      expect(validateValue(Types.any(), date)).toEqual(date);
    });
    it("should validate custom values using the custom validator", () => {
      expect(validateValue(customType, 3)).toBe(3);
    });
    it("should return undefined from custom validators which failed", () => {
      expect(validateValue(customType, 4)).toBeUndefined();
    });
  });

  describe("Arrays", () => {
    const testArrayStructure = Types.arrayOf(Types.string());
    it("Arrays should allow for primitives", () => {
      expect(validateArray(testArrayStructure, ["a", "b", "c", "d"])).toEqual([
        "a",
        "b",
        "c",
        "d"
      ]);
    });
    it("Arrays should strip values for primitives which fail the test", () => {
      expect(validateArray(testArrayStructure, ["a", "b", 3, "d"])).toEqual([
        "a",
        "b",
        "d"
      ]);
    });

    const testArrayStructure2 = Types.arrayOf(
      Types.shape({
        test1: Types.number()
      })
    );
    it("Arrays should allow for complex objects", () => {
      expect(
        validateArray(testArrayStructure2, [{ test1: 3 }, { test1: 4 }])
      ).toEqual([{ test1: 3 }, { test1: 4 }]);
    });
    const testArrayStructure3 = Types.arrayOf(
      Types.shape({
        test1: Types.arrayOf(Types.number()),
        test2: Types.custom({ validator: value => value === "foo" })()
      })
    );
    it("Arrays should allow for complex objects - test 2", () => {
      expect(
        validateArray(testArrayStructure3, [{ test1: [3, 4, 5], test2: "foo" }])
      ).toEqual([{ test1: [3, 4, 5], test2: "foo" }]);
    });
    it("Array should return an empty array if a non-array is passed", () => {
      expect(validateArray("foo")).toEqual([]);
    });
    it("Array should allow an empty array", () => {
      expect(validateArray([])).toEqual([]);
    });
  });

  describe("Objects", () => {
    const testObjectStructure = Types.shape({
      test1: Types.string(),
      test2: Types.number(),
      test3: Types.custom({ validator: value => value !== 4 })()
    });
    it("Object of primitives should allow all props present in the structure", () => {
      expect(
        validateShape(testObjectStructure, {
          test1: "toast",
          test2: 3,
          test3: 1
        })
      ).toEqual({ test1: "toast", test2: 3, test3: 1 });
    });
    it("Object of primitives should only allow for props with values which match their config", () => {
      expect(
        validateShape(testObjectStructure, { test1: 5, test2: 3, test3: 4 })
      ).toEqual({ test2: 3 });
    });
    it("Object of primitives should strip any properties not part of the config", () => {
      expect(
        validateShape(testObjectStructure, {
          test1: "toast",
          test2: 3,
          toast: "bar"
        })
      ).toEqual({ test1: "toast", test2: 3 });
    });

    const testObjectStructure2 = Types.shape({
      test1: testObjectStructure
    });
    it("Objects should allow for arbitrary nesting of objects", () => {
      expect(
        validateShape(testObjectStructure2, {
          test1: { test1: "toast", test2: 3 }
        })
      ).toEqual({ test1: { test1: "toast", test2: 3 } });
    });

    const testObjectStructure3 = Types.shape({
      test1: Types.shape({
        test2: Types.string()
      }),
      test2: Types.string()
    });
    it("Objects containing objects should properly check if an object is provided", () => {
      expect(
        validateShape(testObjectStructure3, { test1: "foo", test2: "bar" })
      ).toEqual({
        test1: {},
        test2: "bar"
      });
    });

    const testObjectStructure4 = Types.shape({
      test2: Types.string(),
      [Types.wildcardKey()]: Types.string()
    });
    const testObjectStructure5 = Types.shape({
      test2: Types.string(),
      [Types.wildcardKey()]: Types.any()
    });
    it("Should, if a key is not specified, see if the key matches the wildcard type, and apply if true", () => {
      expect(
        validateShape(testObjectStructure4, { test1: "foo", test2: "bar" })
      ).toEqual({
        test1: "foo",
        test2: "bar"
      });

      expect(
        validateShape(testObjectStructure5, { test1: 0, test2: "bar" })
      ).toEqual({
        test1: 0,
        test2: "bar"
      });
    });

    const testObjectStructure6 = Types.shape({
      test2: Types.string(),
      [Types.wildcardKey()]: Types.string()
    });
    it("Should, if a key is not specified, and does not match the wildcardKey, strip it out", () => {
      expect(
        validateShape(testObjectStructure6, { test1: 0, test2: "bar" })
      ).toEqual({
        test2: "bar"
      });
    });

    const testObjectStructure7 = Types.shape({
      test1: Types.arrayOf(Types.string())
    });
    it("Should allow an empty array to be passed for an array property", () => {
      expect(validateShape(testObjectStructure7, { test1: [] })).toEqual({
        test1: []
      });
    });
  });

  describe("Non covered types", () => {
    it("A type with no associated validation should throw an error", () => {
      expect(() => getTypeValidation("toast")).toThrowError(/validation/);
    });
  });

  describe("Has wildcard value", () => {
    const testObjectStructure = Types.shape({
      test1: Types.string(),
      test2: Types.number(),
      [Types.wildcardKey()]: Types.any()
    });

    const testObjectStructure2 = Types.shape({
      test1: Types.string(),
      test2: Types.number()
    });

    it("should return true if the objectStructure passed in has a wildcard key", () => {
      expect(hasWildcardKey(testObjectStructure)).toBe(true);
    });

    it("should return false if no wildcard key passed in", () => {
      expect(hasWildcardKey(testObjectStructure2)).toBe(false);
    });
  });

  describe("GetValueType", () => {
    const testObjectStructure = Types.shape({
      test1: Types.string(),
      test2: Types.number(),
      [Types.wildcardKey()]: Types.number()
    });

    const testObjectStructure2 = Types.shape({
      test1: Types.string(),
      test2: Types.number()
    });

    it("should return the correct type for a key that is present, if no wildcard present", () => {
      expect(getValueType(testObjectStructure, "test1", false)().type).toEqual(
        Types.string()().type
      );
    });

    it("should return the wildcard value if key not present and wildcard is", () => {
      expect(getValueType(testObjectStructure, "test3", true)().type).toEqual(
        Types.number()().type
      );
    });

    it("should return undefined if no wildcard or matching key", () => {
      expect(getValueType(testObjectStructure, "test3", false)).toEqual(
        undefined
      );
    });
  });
});
