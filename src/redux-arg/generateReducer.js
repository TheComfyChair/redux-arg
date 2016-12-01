//@flow
//==============================
// Flow imports
//==============================
import type { StructureType, PrimitiveType, ShapeStructure } from './structure';
import type { PartialReducer, Selectors } from './reducers';

import { combineReducers } from 'redux';
import { reduce, find } from 'lodash';
import { createReducer } from './reducers';
import { PROP_TYPES } from './structure';


type ProcessStructure = (
    memo: PartialReducer,
    propValue: StructureType|PrimitiveType,
    propName: string,
) => PartialReducer;

type BuildReducers = (name: string, structure: ShapeStructure, options: {
    baseSelector: Selectors,
    locationString: string,
}) => PartialReducer;

export function buildReducers(name: string, structure: ShapeStructure, {
    baseSelector = state => state[name],
    locationString = name,
}: {
    baseSelector: Selectors,
    locationString: string,
}){

    //Build up the reducers, actions, and selectors for this level. Due to recursion,
    //these objects will be assigned to a property in the parent object, or simply
    //returned to the call site for use in the rest of the application.
    const temp = reduce(structure, processStructure, {
        reducers: {},
        actionsObject: {},
        selectorsObject: {},
    });

    //The Redux 'combineReducers' helper function is used here to save a little bit of boilerplate.
    //This helper, if you're not aware, ensures that the correct store properties are passed to the
    //reducers assigned to those properties.
    return { ...temp, reducers: combineReducers(temp.reducers) };

    function processStructure<ProcessStructure>(memo, propValue, propName) {
        //Get the structure from the propValue. In the case of 'StructureType' properties, this
        //will be some form of shape (or primitives in the case of arrays). At this point we
        //are only interested in whether or not the structure contains reducers, as that
        //has an impact on how we proceed with regards to calls.
        const { structure: propStructure} = propValue();
        const containsReducers = !!find(propStructure, v => v().type === PROP_TYPES._reducer);

        //Create the child reducer. Depending on whether or not the current structure level contains
        //child reducers, we will either recursively call buildReducers, or we will call the
        //createReducer function, which will create the correct reducer for the given structure
        //(which can be either object, array, or primitive).
        let childReducer = containsReducers ? buildReducers(propName, structure, {
            locationString: `${locationString}.${propName}`,
            baseSelector: state => baseSelector(state)[propName],
        }) : createReducer(propValue);

        //As the object is built up, we want to assign the reducers/actions created
        //by the child to a location on the reducers/actions object which will match up
        //to their location. Selectors are created at this level, as the child does not
        //need to know where it is located within the grand scheme of things.
        return {
            reducers: {
                ...memo.reducers,
                [propName]: childReducer.reducers,
            },
            actionsObject: {
                ...memo.actionsObject,
                [propName]: childReducer.actionsObject,
            },
            selectorsObject: {
                ...memo.selectorsObject,
                [propName]: state => baseSelector(state)[propName],
            },
        };
    }
}









