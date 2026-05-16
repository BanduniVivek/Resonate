import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    name: '',
};

export const activateSlice = createSlice({
    name: 'activate',
    initialState,
    reducers: {
        setName: (state, action) => {
            state.name = action.payload;
        },
    },
});

export const { setName } = activateSlice.actions;

export default activateSlice.reducer;
