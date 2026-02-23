import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { toast } from "react-toastify";
import { sendNotifications } from "../utils/sendNotification";

export const useHolidayUtils = (selectedGroupId) => {
  const [holidays, setHolidays] = useState([]);
  const [activeHolidays, setActiveHolidays] = useState([]);
  // showHolidayEndModal, endedHoliday, setEndedHoliday - OLIB TASHLANDI

  // Format date to "2026.18-Fevral" format
  const formatDateToUzbek = useCallback((dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const day = date.getDate();
    const months = [
      "Yanvar",
      "Fevral",
      "Mart",
      "Aprel",
      "May",
      "Iyun",
      "Iyul",
      "Avgust",
      "Sentabr",
      "Oktabr",
      "Noyabr",
      "Dekabr",
    ];
    const month = months[date.getMonth()];
    return `${year}.${day}-${month}`;
  }, []);

  // Format date for backend (YYYY-MM-DD)
  const formatDateForBackend = useCallback((dateStr) => {
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  }, []);

  // Fetch holidays
  useEffect(() => {
    if (!selectedGroupId) {
      setHolidays([]);
      return;
    }

    const holidaysQuery = query(
      collection(db, "holidays"),
      where("groupId", "==", selectedGroupId),
      where("isActive", "==", true),
    );

    const unsub = onSnapshot(holidaysQuery, (snap) => {
      const holidaysList = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setHolidays(holidaysList);

      // Update active holidays
      const today = new Date().toISOString().split("T")[0];
      const active = holidaysList.filter(
        (h) => today >= h.startDate && today <= h.endDate,
      );
      setActiveHolidays(active);
    });

    return () => unsub();
  }, [selectedGroupId]);

  // Check if a date is holiday
  const isHoliday = useCallback(
    (date) => {
      const dateStr = date.toISOString().split("T")[0];
      return holidays.some(
        (h) => dateStr >= h.startDate && dateStr <= h.endDate,
      );
    },
    [holidays],
  );

  // Send holiday start notifications
  const sendHolidayStartNotifications = useCallback(
    async (holidayData, students) => {
      const studentsWithTelegram = students.filter((s) => s.telegramId);

      if (studentsWithTelegram.length === 0) return;

      const startDateFormatted = formatDateToUzbek(holidayData.startDate);
      const endDateFormatted = formatDateToUzbek(holidayData.endDate);

      const message = `🏖 <b>TATIL BOSHLANDI</b>

📚 Guruh: <b>${holidayData.groupName}</b>
📅 Tatil: <b>${startDateFormatted} — ${endDateFormatted}</b>
📝 Izoh: <i>${holidayData.description}</i>

✨ Tatil muddati davomida darslar bo'lmaydi.
🔔 Tatil tugagach yana xabar beramiz.`;

      const notifications = studentsWithTelegram.map((s) => ({
        telegramId: s.telegramId,
        studentName:
          s.studentName || `${s.firstName || ""} ${s.lastName || ""}`.trim(),
        message: message,
        groupId: holidayData.groupId,
        studentId: s.id,
        notificationType: "holiday_start",
      }));

      try {
        const result = await sendNotifications(notifications, {
          showToast: true,
          toastSuccess: `${notifications.length} ta o'quvchiga tatil xabari yuborildi`,
          toastError: "Tatil xabari yuborilmadi",
        });

        if (result.success) {
          toast.success(
            `${notifications.length} ta o'quvchiga tatil xabari yuborildi!`,
          );
        }
      } catch (error) {
        console.error("Holiday notification error:", error);
      }
    },
    [formatDateToUzbek],
  );

  // Send holiday end notifications (bu endi ishlatilmaydi, lekin saqlab qo'yildi)
  const sendHolidayEndNotifications = useCallback(
    async (holidayData, students) => {
      const studentsWithTelegram = students.filter((s) => s.telegramId);

      if (studentsWithTelegram.length === 0) return;

      const startDateFormatted = formatDateToUzbek(holidayData.startDate);
      const endDateFormatted = formatDateToUzbek(holidayData.endDate);

      const message = `✅ <b>TATIL TUGADI</b>

📚 Guruh: <b>${holidayData.groupName}</b>
📅 Tatil: <b>${startDateFormatted} — ${endDateFormatted}</b>
📝 Izoh: <i>${holidayData.description}</i>

🎯 Ertadan darslar boshlanadi!
📚 Dars jadvalingizga qarab kelishingizni so'raymiz.`;

      const notifications = studentsWithTelegram.map((s) => ({
        telegramId: s.telegramId,
        studentName:
          s.studentName || `${s.firstName || ""} ${s.lastName || ""}`.trim(),
        message: message,
        groupId: holidayData.groupId,
        studentId: s.id,
        notificationType: "holiday_end",
      }));

      try {
        await sendNotifications(notifications, {
          showToast: false, // Toast ko'rsatilmaydi
        });
      } catch (error) {
        console.error("Holiday end notification error:", error);
      }
    },
    [formatDateToUzbek],
  );

  return {
    holidays,
    activeHolidays,
    // showHolidayEndModal, setShowHolidayEndModal, endedHoliday, setEndedHoliday - OLIB TASHLANDI
    isHoliday,
    sendHolidayStartNotifications,
    sendHolidayEndNotifications,
    formatDateToUzbek,
    formatDateForBackend,
  };
};
