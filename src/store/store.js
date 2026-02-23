import { configureStore } from "@reduxjs/toolkit";
import ThemeReducer from "../createSlice/ThemeSlice";
import languageSlice from "../createSlice/ChangeLanguage";
import groupsSlice from "../createSlice/GroupsSlice/index";
import notificationReducer from "../createSlice/notificationSlice";

export const store = configureStore({
  reducer: {
    theme: ThemeReducer,
    language: languageSlice,
    groups: groupsSlice,
    notifications: notificationReducer,
  },
});
