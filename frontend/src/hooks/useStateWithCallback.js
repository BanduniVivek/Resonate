import { useState, useRef, useEffect, useCallback } from 'react';


// makes usestate able to take a callback which will render on state update
//useRef holds the reference of callback which persist between renders so that it can be executed later
// as soon as state update useEffect executes the callback stored in useRef and resets it

//need : useState is asynchronus by nature thus if we use state after upodation we still get old value
//thus this ensures that callback runs after state has uopdated successfully


export const useStateWithCallback = (intialState) => {
    
    const [state, setState] = useState(intialState);
    const cbRef = useRef(null);

    const updateState = useCallback((newState, cb) => {
        cbRef.current = cb;

        setState((prev) =>
            typeof newState === 'function' ? newState(prev) : newState
        );
    }, []);
    
useEffect(() => {
    if (cbRef.current) {
        cbRef.current(state);
        cbRef.current = null;
    }
}, [state]);


return [state, updateState];


};

