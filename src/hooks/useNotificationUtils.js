// hooks/useNotificationUtils.js
import { useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { toast } from "react-toastify";

export const useNotificationUtils = (
  formatMoney,
  calculateStudentStatus,
  setNotificationLog,
  formatDateToUzbek,
) => {
  const checkAndSendGlobalNotifications = useCallback(async () => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    const todayKey = `notification_check_${todayStr}`;

    if (localStorage.getItem(todayKey)) return;

    try {
      const groupsSnapshot = await getDocs(collection(db, "groups"));
      const allGroups = groupsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      let totalNotifications = 0;
      const notificationsToSend = [];
      const logEntries = [];

      for (const group of allGroups) {
        const studentsSnapshot = await getDocs(
          collection(db, "groups", group.id, "students"),
        );
        const groupStudents = studentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        for (const student of groupStudents) {
          const paymentsQuery = query(
            collection(db, "payments"),
            where("studentId", "==", student.id),
          );
          const paymentsSnapshot = await getDocs(paymentsQuery);
          const studentPayments = paymentsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const info = calculateStudentStatus(student, group, studentPayments);

          if (info.isPaidForCurrentCycle || !student.telegramId) continue;

          const storageKey = `global_notif_${student.id}_${todayStr}`;
          if (localStorage.getItem(storageKey)) continue;

          const lessonsLeft = info.currentCycle.lessonsLeft;
          const totalLessons = info.currentCycle.totalLessons || 12;
          const hasDebt = info.debts.length > 0;
          const totalDebt = info.debts.reduce(
            (sum, d) => sum + (d.debtAmount || 0),
            0,
          );

          let message = "";
          let notificationType = "";

          const studentName = student.studentName || student.firstName || "";
          const studentLastName = student.lastName || "";
          const fullName = `<b>${studentName} ${studentLastName}</b>`;

          if (lessonsLeft === 0 && !hasDebt) {
            message = `<b>🚨 DIQQAT: TO'LOV MUDDATI TUGADI</b>

👤 Hurmatli ${fullName}!

Sizning to'lov muddatingiz <b>bugun</b> o'z nihoyasiga yetdi.
Bu oyda jami <b>${totalLessons} ta dars</b> bo'lib, barchasi tugadi.

Mashg'ulotlarda uzluksiz qatnashish va guruhdan chetlatilmaslik uchun to'lovni <b>bugun</b> amalga oshirishingizni so'raymiz.
-------------------------------------------------------------------
💳 <i>To'lovni markazimizga kelib tolang yoki elektron tarizda</i>`;

            notificationType = "last_day_warning";
          } else if (hasDebt) {
            message = `<b>⛔️ TO'LANMAGAN QARZDORLIK</b>

👤 Hurmatli ${fullName}!

Sizning hisobingizda to'lanmagan qarzdorlik mavjud.

📉 Qarz miqdori: <b>${formatMoney(totalDebt)}</b>

Iltimos, ushbu qarzdorlikni tez orada to'lang. Aks holda guruhdan chetlatilishingiz mumkin.`;

            notificationType = "debt";
          } else if (lessonsLeft <= 3 && lessonsLeft > 0) {
            message = `<b>⏳ TO'LOV MUDDATI ESLATMASI</b>

👤 Hurmatli ${fullName}!

Bu oyda jami <b>${totalLessons} ta dars</b> bo'lib, 
to'lovga <b>${lessonsLeft} ta</b> dars qoldi.

Mashg'ulotlaringiz to'xtab qolmasligi uchun to'lovni o'z vaqtida tolashingizni eslatib o'tamiz.
-------------------------------------------------------------------
✨ <i>Biz bilan birga ekanligingizdan xursandmiz!</i>`;

            notificationType = "reminder";
          } else {
            continue;
          }

          notificationsToSend.push({
            telegramId: student.telegramId,
            studentName: `${studentName} ${studentLastName}`.trim(),
            message: message,
            groupId: group.id,
            groupName: group.groupName,
            studentId: student.id,
            notificationType: notificationType,
          });

          logEntries.push({
            student: `${studentName} ${studentLastName}`.trim(),
            type: notificationType,
            status: "success",
          });

          totalNotifications++;
        }
      }

      if (notificationsToSend.length > 0) {
        try {
          const response = await fetch(
            "http://localhost:8000/send-notifications",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                notifications: notificationsToSend,
                date: todayStr,
              }),
            },
          );

          if (response.ok) {
            notificationsToSend.forEach((n) => {
              localStorage.setItem(
                `global_notif_${n.studentId}_${todayStr}`,
                "true",
              );
            });

            localStorage.setItem(todayKey, "true");

            setNotificationLog((prev) => [
              {
                date: formatDateToUzbek(new Date().toISOString()),
                count: totalNotifications,
                details: logEntries,
                type: "auto_global",
              },
              ...prev.slice(0, 9),
            ]);

            toast.success(
              `Avtomatik tizim: ${totalNotifications} ta o'quvchiga tolov eslatmasi yuborildi.`,
            );
          }
        } catch (error) {
          console.error("Notification sending error:", error);
        }
      }
    } catch (error) {
      console.error("Global notification check error:", error);
    }
  }, [
    formatMoney,
    calculateStudentStatus,
    setNotificationLog,
    formatDateToUzbek,
  ]);

  const handleSendManualMessage = useCallback(
    async (
      msgGroupId,
      msgStudentId,
      msgText,
      msgStudentsList,
      todayStr,
      setSendingMsg,
      setShowMsgModal,
      setMsgText,
      setMsgStudentId,
    ) => {
      if (!msgGroupId || !msgStudentId || !msgText.trim()) {
        toast.warning("Barcha maydonlarni to'ldiring!");
        return false;
      }

      const targetStudent = msgStudentsList.find((s) => s.id === msgStudentId);
      if (!targetStudent?.telegramId) {
        toast.error("Bu o'quvchida Telegram ID yo'q!");
        return false;
      }

      setSendingMsg(true);

      const studentName =
        targetStudent.studentName || targetStudent.firstName || "";
      const studentLastName = targetStudent.lastName || "";

      const manualPayload = {
        telegramId: targetStudent.telegramId,
        studentName: `${studentName} ${studentLastName}`.trim(),
        message: msgText,
        groupId: msgGroupId,
        studentId: msgStudentId,
        notificationType: "manual_message",
      };

      try {
        const response = await fetch(
          "http://localhost:8000/send-notifications",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              notifications: [manualPayload],
              date: todayStr,
            }),
          },
        );

        if (response.ok) {
          setNotificationLog((prev) => [
            {
              date: formatDateToUzbek(new Date().toISOString()),
              count: 1,
              details: [
                {
                  student: manualPayload.studentName,
                  type: "manual",
                  status: "success",
                },
              ],
              type: "manual",
            },
            ...prev.slice(0, 9),
          ]);
          toast.success("Xabar muvaffaqiyatli yuborildi!");
          setShowMsgModal(false);
          setMsgText("");
          setMsgStudentId("");
          return true;
        } else {
          toast.error("Xabar yuborishda xatolik bo'ldi.");
          return false;
        }
      } catch (error) {
        console.error(error);
        toast.error("Serverga ulanib bo'lmadi.");
        return false;
      } finally {
        setSendingMsg(false);
      }
    },
    [setNotificationLog, formatDateToUzbek],
  );

  return {
    checkAndSendGlobalNotifications,
    handleSendManualMessage,
  };
};
