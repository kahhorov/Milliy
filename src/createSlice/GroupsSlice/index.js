import { createSlice } from "@reduxjs/toolkit";

const groupsSlice = createSlice({
  name: "Groups",
  initialState: { items: [] },
  reducers: {
    setGroups: (state, action) => {
      state.items = action.payload;
    },
  },
});
export const { setGroups } = groupsSlice.actions;
export default groupsSlice.reducer;
