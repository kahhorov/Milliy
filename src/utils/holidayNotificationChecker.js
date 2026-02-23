import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { v4 as uuidv4 } from "uuid";
import { setNotifications } from "../createSlice/notificationSlice";

export const checkEndedHolidays = async (dispatch, addNotification) => {
  try {
    // O'zbekiston vaqtini olish
    const now = new Date();
    const uzbekOffset = 5 * 60 * 60 * 1000;
    const uzbekDate = new Date(now.getTime() + uzbekOffset);
    const todayStr = uzbekDate.toISOString().split("T")[0];

    // Barcha active holidaylarni olish
    const holidaysQuery = query(
      collection(db, "holidays"),
      where("isActive", "==", true),
    );

    const snapshot = await getDocs(holidaysQuery);

    // Tugagan holidaylarni aniqlash (endDate < today)
    const endedHolidays = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((h) => h.endDate < todayStr);

    // Har bir tugagan holiday uchun bildirishnoma yaratish
    for (const holiday of endedHolidays) {
      const notificationKey = `holiday_ended_${holiday.id}`;

      // Agar bildirishnoma allaqachon yuborilgan bo'lsa, o'tkazib yuborish
      if (localStorage.getItem(notificationKey)) continue;

      // Guruh ma'lumotlarini olish
      const groupRef = doc(db, "groups", holiday.groupId);
      const groupSnap = await getDoc(groupRef);
      const groupData = groupSnap.exists() ? groupSnap.data() : {};

      const notification = {
        id: uuidv4(),
        type: "holiday_ended",
        groupId: holiday.groupId,
        groupName: holiday.groupName || groupData.groupName || "Noma'lum",
        startDate: holiday.startDate,
        endDate: holiday.endDate,
        description: holiday.description || "Tatil tugadi",
        createdAt: new Date().toISOString(),
        read: false,
      };

      // LocalStorage dan mavjud bildirishnomalarni olish
      const existing = JSON.parse(
        localStorage.getItem("notifications") || "[]",
      );

      // Dublikatni tekshirish
      const exists = existing.some(
        (n) =>
          n.groupId === notification.groupId &&
          n.type === "holiday_ended" &&
          n.endDate === notification.endDate,
      );

      if (!exists) {
        // Yangi bildirishnomani qo'shish
        const updated = [notification, ...existing];
        localStorage.setItem("notifications", JSON.stringify(updated));

        // Redux state ni yangilash
        dispatch(addNotification(notification));
      }

      // Bildirishnoma yuborilganligini belgilash
      localStorage.setItem(notificationKey, "true");
    }

    // Eski bildirishnomalarni tozalash (30 kundan eskilari)
    const allNotifications = JSON.parse(
      localStorage.getItem("notifications") || "[]",
    );
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const filtered = allNotifications.filter((n) => {
      const notifDate = new Date(n.createdAt);
      return notifDate > thirtyDaysAgo;
    });

    if (filtered.length !== allNotifications.length) {
      localStorage.setItem("notifications", JSON.stringify(filtered));
      dispatch(setNotifications(filtered));
    }
  } catch (error) {
    console.error("Error checking ended holidays:", error);
  }
};
