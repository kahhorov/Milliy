import { createSlice } from "@reduxjs/toolkit";

const languageSlice = createSlice({
  name: "Language",
  initialState: {
    value: localStorage.getItem("Language") || "en",
  },
  reducers: {
    changeLanguage: (state, { payload }) => {
      state.value = payload;
      localStorage.setItem("Language", payload);
    },
  },
});

export const { changeLanguage } = languageSlice.actions;
export default languageSlice.reducer;
