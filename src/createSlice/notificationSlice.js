import { createSlice } from "@reduxjs/toolkit";

// LocalStorage dan ma'lumotlarni yuklash
const loadState = () => {
  try {
    const serializedState = localStorage.getItem("notificationState");
    if (serializedState === null) {
      return {
        notifications: [],
        readNotifications: [],
        unreadCount: 0,
      };
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.error("Error loading state from localStorage:", err);
    return {
      notifications: [],
      readNotifications: [],
      unreadCount: 0,
    };
  }
};

const initialState = loadState();

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setNotifications: (state, action) => {
      state.notifications = action.payload;
      // Faqat o'qilmaganlarni hisoblash
      state.unreadCount = action.payload.filter(
        (n) => !state.readNotifications.includes(n.id),
      ).length;

      // State ni localStorage ga saqlash
      try {
        localStorage.setItem("notificationState", JSON.stringify(state));
      } catch (err) {
        console.error("Error saving state to localStorage:", err);
      }
    },
    addNotification: (state, action) => {
      const exists = state.notifications.some(
        (n) => n.id === action.payload.id,
      );
      if (!exists) {
        state.notifications.unshift(action.payload);
        // O'qilmaganlarga qo'shish (agar o'qilmagan bo'lsa)
        if (!state.readNotifications.includes(action.payload.id)) {
          state.unreadCount += 1;
        }

        // State ni localStorage ga saqlash
        try {
          localStorage.setItem("notificationState", JSON.stringify(state));
        } catch (err) {
          console.error("Error saving state to localStorage:", err);
        }
      }
    },
    markAsRead: (state, action) => {
      const notificationId = action.payload;
      if (!state.readNotifications.includes(notificationId)) {
        state.readNotifications.push(notificationId);
        // O'qilmaganlar sonini kamaytirish
        state.unreadCount = Math.max(0, state.unreadCount - 1);

        // State ni localStorage ga saqlash
        try {
          localStorage.setItem("notificationState", JSON.stringify(state));
        } catch (err) {
          console.error("Error saving state to localStorage:", err);
        }
      }
    },
    markAllAsRead: (state) => {
      // Barcha notification ID larni o'qilganlarga qo'shish
      const allIds = state.notifications.map((n) => n.id);
      state.readNotifications = [
        ...new Set([...state.readNotifications, ...allIds]),
      ];
      state.unreadCount = 0;

      // State ni localStorage ga saqlash
      try {
        localStorage.setItem("notificationState", JSON.stringify(state));
      } catch (err) {
        console.error("Error saving state to localStorage:", err);
      }
    },
    clearReadNotifications: (state) => {
      // O'qilgan bildirishnomalarni tozalash
      state.notifications = state.notifications.filter(
        (n) => !state.readNotifications.includes(n.id),
      );
      state.readNotifications = [];
      state.unreadCount = 0;

      // State ni localStorage ga saqlash
      try {
        localStorage.setItem("notificationState", JSON.stringify(state));
      } catch (err) {
        console.error("Error saving state to localStorage:", err);
      }
    },
  },
});

export const {
  setNotifications,
  addNotification,
  markAsRead,
  markAllAsRead,
  clearReadNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;
