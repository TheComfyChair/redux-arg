import { buildStoreChunk } from "../buildStoreChunk";
import { Types } from "../structure";
import { createCombinedAction } from "../reducers/batchUpdates";
import { createStore, combineReducers } from "redux";
import isFunction from "lodash/isFunction";

describe("buildStoreChunk", () => {
  it("Will throw error if a structure is not defined", () => {
    expect(() => buildStoreChunk("toast")).toThrowError(/structure/);
  });
  it("Will accept a single reducer (no nesting)", () => {
    expect(
      Object.keys(buildStoreChunk("toast", Types.reducer(Types.string())))
    ).toEqual(["reducers", "actions", "selectors"]);
  });
  it("Will return an object containing reducers, actions, and selectors as the result", () => {
    expect(
      Object.keys(
        buildStoreChunk("toast", {
          example: Types.reducer(Types.string())
        })
      )
    ).toEqual(["reducers", "actions", "selectors", "resetAll"]);
  });

  describe("Resulting chunk", () => {
    const chunk = buildStoreChunk("example", {
      nested1: Types.reducer(Types.string("foo")),
      nested2: Types.reducer(
        Types.shape({
          foo: Types.number(),
          bar: Types.string()
        })
      ),
      nested3: Types.reducer(Types.arrayOf(Types.number(), [1, 2, 3])),
      nested4: Types.reducer({
        innerNested1: Types.reducer(Types.string("bar")),
        innerNested2: Types.reducer({
          innerNested3: Types.reducer(Types.string("baz"))
        })
      }),
      nested5: Types.reducer(
        Types.shape({
          arrayExample: Types.arrayOf(Types.string())
        })
      )
    });
    const nonNestedChunk = buildStoreChunk(
      "example2",
      Types.reducer(Types.string("foo"))
    );

    describe("Selectors", () => {
      const store = createStore(
        combineReducers({
          ...chunk.reducers
        })
      );

      it("Selectors object has the correct top level structure for a nested chunk", () => {
        expect(Object.keys(chunk.selectors)).toEqual([
          "nested1",
          "nested2",
          "nested3",
          "nested4",
          "nested5"
        ]);
      });
      it("Selectors object is a function for a non-nested chunk", () => {
        expect(isFunction(nonNestedChunk.selectors)).toBe(true);
      });
      it("Nested selectors object has the correct structure for a defined reducer", () => {
        expect(Object.keys(chunk.selectors.nested4)).toEqual([
          "innerNested1",
          "innerNested2"
        ]);
      });
      it("Selector returns correct value", () => {
        expect(chunk.selectors.nested1(store.getState())).toEqual("foo");
      });
      it("Nested selector returns correct value", () => {
        expect(chunk.selectors.nested4.innerNested1(store.getState())).toEqual(
          "bar"
        );
      });
    });

    describe("Actions", () => {
      it("Actions object has the correct top level structure for a nested chunk", () => {
        expect(Object.keys(chunk.actions)).toEqual([
          "nested1",
          "nested2",
          "nested3",
          "nested4",
          "nested5"
        ]);
      });
      it("Actions object has the correct top level structure for a non nested chunk", () => {
        expect(Object.keys(nonNestedChunk.actions)).toEqual([
          "replace",
          "reset"
        ]);
      });
      it("Nested actions object has the correct structure for a chunk", () => {
        expect(Object.keys(chunk.actions.nested4)).toEqual([
          "innerNested1",
          "innerNested2"
        ]);
      });
      it("Replace actions return an object that contains a type and payload", () => {
        expect(Object.keys(chunk.actions.nested1.replace("bar"))).toEqual([
          "type",
          "payload"
        ]);
        expect(Object.keys(chunk.actions.nested2.replace({}))).toEqual([
          "type",
          "payload"
        ]);
        expect(Object.keys(chunk.actions.nested3.replace([]))).toEqual([
          "type",
          "payload",
          "index"
        ]);
      });
    });

    describe("Combined actions and selectors (nested chunk)", () => {
      const store = createStore(
        combineReducers({
          ...chunk.reducers,
          ...nonNestedChunk.reducers
        })
      );

      it("Dispatching an action should correctly update the store", () => {
        store.dispatch(chunk.actions.nested1.replace("bar"));
        expect(chunk.selectors.nested1(store.getState())).toEqual("bar");

        store.dispatch(chunk.actions.nested1.reset());
        expect(chunk.selectors.nested1(store.getState())).toEqual("foo");
      });

      it("Dispatching an empty array property should replace existing array", () => {
        store.dispatch(chunk.actions.nested5.replace({ arrayExample: ["2"] }));
        store.dispatch(chunk.actions.nested5.update({ arrayExample: [] }));
        expect(chunk.selectors.nested5(store.getState())).toEqual({
          arrayExample: []
        });
      });
    });

    describe("Combined actions and selectors (non nested chunk)", () => {
      const store = createStore(
        combineReducers({
          ...chunk.reducers,
          ...nonNestedChunk.reducers
        })
      );

      it("Dispatching an action should correctly update the store", () => {
        store.dispatch(nonNestedChunk.actions.replace("bar"));
        expect(nonNestedChunk.selectors(store.getState())).toEqual("bar");

        store.dispatch(nonNestedChunk.actions.reset());
        expect(nonNestedChunk.selectors(store.getState())).toEqual("foo");
      });
    });

    describe("Combined actions", () => {
      const store = createStore(
        combineReducers({
          ...chunk.reducers,
          ...nonNestedChunk.reducers
        })
      );

      it("Dispatching a createCombinedAction updates the store correctly", () => {
        store.dispatch(
          createCombinedAction({
            name: "batchUpdateFunsies",
            actions: [
              nonNestedChunk.actions.replace("bar"),
              chunk.actions.nested2.update({
                foo: 4
              }),
              chunk.actions.nested2.update({
                bar: "boop!"
              }),
              chunk.actions.nested3.replace([4, 5, 6]),
              chunk.actions.nested3.removeAtIndex(1)
            ]
          })
        );
        expect(nonNestedChunk.selectors(store.getState())).toEqual("bar");
        expect(chunk.selectors.nested2(store.getState())).toEqual({
          foo: 4,
          bar: "boop!"
        });
        expect(chunk.selectors.nested3(store.getState())).toEqual([4, 6]);
      });

      describe("reset all action", () => {
        it("Calling reset all will reset all store chunks", () => {
          store.dispatch(
            createCombinedAction({
              name: "batchUpdateFunsies",
              actions: [
                chunk.actions.nested2.update({
                  foo: 4
                }),
                chunk.actions.nested2.update({
                  bar: "boop!"
                }),
                chunk.actions.nested3.replace([4, 5, 6]),
                chunk.actions.nested3.removeAtIndex(1),
                chunk.actions.nested4.innerNested1.replace("boop!")
              ]
            })
          );

          store.dispatch(chunk.resetAll());
          expect(chunk.selectors.nested2(store.getState())).toEqual({
            foo: 0,
            bar: ""
          });
          expect(chunk.selectors.nested3(store.getState())).toEqual([1, 2, 3]);
          expect(chunk.selectors.nested4.innerNested1(store.getState())).toBe(
            "bar"
          );
        });
      });
    });
  });
});
