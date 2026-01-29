import { createSlice } from "@reduxjs/toolkit";

const ThemeSlice = createSlice({
  name: "Theme",
  initialState: {
    value: localStorage.getItem("themeSlice") || "dark",
  },
  reducers: {
    changeTheme: (state, { payload }) => {
      state.value = payload;
      localStorage.setItem("themeSlice", payload);
    },
  },
});

export const { changeTheme } = ThemeSlice.actions;
export default ThemeSlice.reducer;
