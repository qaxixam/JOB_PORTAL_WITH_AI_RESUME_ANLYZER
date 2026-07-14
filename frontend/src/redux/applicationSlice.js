import { createSlice } from "@reduxjs/toolkit";

const applicationSlice = createSlice({
    name: 'application',
    initialState: {
        applicants: null,
        currentAnalysis: null,
    },
    reducers: {
        setAllApplicants: (state, action) => {
            state.applicants = action.payload;
        },
        setCurrentAnalysis: (state, action) => {
            state.currentAnalysis = action.payload;
        },
    }
});
export const { setAllApplicants, setCurrentAnalysis } = applicationSlice.actions;
export default applicationSlice.reducer;