import { useCallback } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { toast } from "react-toastify";

export const usePaymentUtils = (
  selectedGroupId,
  groups,
  todayStr,
  setNotificationLog,
  isHoliday,
  formatDateToUzbek,
) => {
  const formatMoney = (num) => {
    if (!num && num !== 0) return "0 so'm";

    // Format with thousand separators
    const numStr = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${numStr} so'm`;
  };

  const dayToNumber = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Yakshanba: 0,
    Dushanba: 1,
    Seshanba: 2,
    Chorshanba: 3,
    Payshanba: 4,
    Juma: 5,
    Shanba: 6,
  };

  const getTargetDays = (groupDays) => {
    if (!groupDays) return [];
    if (
      groupDays === "Every day" ||
      (Array.isArray(groupDays) && groupDays.includes("Every day"))
    ) {
      return [1, 2, 3, 4, 5, 6];
    }
    if (Array.isArray(groupDays)) {
      return groupDays
        .map((d) => dayToNumber[d])
        .filter((d) => d !== undefined);
    }
    return [];
  };

  const getLessonsPerMonth = (targetDays, date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let lessonCount = 0;
    const currentDate = new Date(firstDay);

    while (currentDate <= lastDay) {
      if (
        !isHoliday(currentDate) &&
        targetDays.includes(currentDate.getDay())
      ) {
        lessonCount++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return lessonCount;
  };

  const getLessonsInPeriod = (targetDays, startDate, endDate) => {
    let lessonCount = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (
        !isHoliday(currentDate) &&
        targetDays.includes(currentDate.getDay())
      ) {
        lessonCount++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return lessonCount;
  };

  const calculateStudentStatus = (student, group, allPayments) => {
    if (!group || !student?.createdAt) return { status: "unknown", info: {} };

    const studentPayments = allPayments.filter(
      (p) => p.studentId === student.id,
    );
    const totalPaid = studentPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const coursePrice = Number(group.coursePrice) || 0;

    let startDate;
    if (student.createdAt?.seconds)
      startDate = new Date(student.createdAt.seconds * 1000);
    else startDate = new Date(student.createdAt);
    startDate.setHours(0, 0, 0, 0);

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const targetDays = getTargetDays(group.days);
    if (targetDays.length === 0)
      return { status: "error", msg: "Guruh kunlari yo'q" };

    const isEveryDay =
      group.days === "Every day" ||
      (Array.isArray(group.days) && group.days.includes("Every day"));

    const getMonthlyLessonCount = (date) => {
      if (isEveryDay) {
        return getLessonsPerMonth(targetDays, date);
      } else {
        const daysPerWeek = targetDays.length;
        return daysPerWeek * 4;
      }
    };

    // Sikllarni yaratish
    let cycles = [];
    let currentCycleStart = new Date(startDate);
    let cycleIndex = 1;

    const limitDate = new Date();
    limitDate.setFullYear(limitDate.getFullYear() + 2);

    while (currentCycleStart <= limitDate) {
      const monthLessonCount = getMonthlyLessonCount(currentCycleStart);

      let lessonCounter = 0;
      let cycleEndDate = new Date(currentCycleStart);

      while (lessonCounter < monthLessonCount && cycleEndDate <= limitDate) {
        if (
          !isHoliday(cycleEndDate) &&
          targetDays.includes(cycleEndDate.getDay())
        ) {
          lessonCounter++;
        }
        if (lessonCounter < monthLessonCount) {
          cycleEndDate.setDate(cycleEndDate.getDate() + 1);
        }
      }

      if (cycleEndDate > limitDate) break;

      const isActive =
        currentCycleStart <= todayDate && cycleEndDate >= todayDate;

      cycles.push({
        index: cycleIndex,
        startDate: new Date(currentCycleStart),
        endDate: new Date(cycleEndDate),
        lessonCount: monthLessonCount,
        isActive: isActive,
        status: "pending",
      });

      currentCycleStart = new Date(cycleEndDate);
      currentCycleStart.setDate(currentCycleStart.getDate() + 1);
      cycleIndex++;
    }

    // Qolgan logika
    let remainingMoney = totalPaid;
    let debts = [];

    const passedCycles = cycles.filter((c) => c.endDate < todayDate);
    const activeCycle = cycles.find((c) => c.isActive);

    passedCycles.forEach((cycle) => {
      if (remainingMoney >= coursePrice) {
        cycle.status = "paid";
        remainingMoney -= coursePrice;
      } else if (remainingMoney > 0) {
        cycle.status = "partial";
        cycle.paidAmount = remainingMoney;
        cycle.debtAmount = coursePrice - remainingMoney;
        remainingMoney = 0;
        debts.push({
          startDate: cycle.startDate,
          endDate: cycle.endDate,
          debtAmount: cycle.debtAmount,
          cycleIndex: cycle.index,
        });
      } else {
        cycle.status = "unpaid";
        cycle.debtAmount = coursePrice;
        debts.push({
          startDate: cycle.startDate,
          endDate: cycle.endDate,
          debtAmount: cycle.debtAmount,
          cycleIndex: cycle.index,
        });
      }
    });

    let currentStatusInfo = {
      lessonsPassed: 0,
      totalLessons: activeCycle ? activeCycle.lessonCount : 12,
      statusType: "new",
      text: "Jarayonda",
      isPaid: false,
      lessonsLeft: activeCycle ? activeCycle.lessonCount : 12,
      lessonCount: activeCycle ? activeCycle.lessonCount : 12,
    };

    let finalStatus = "active";
    let badgeText = "Yangi / Kutilmoqda";

    if (activeCycle) {
      const lessonsPassed = getLessonsInPeriod(
        targetDays,
        activeCycle.startDate,
        todayDate,
      );

      const totalLessonsInCycle = activeCycle.lessonCount;
      const lessonsLeft = totalLessonsInCycle - lessonsPassed;

      currentStatusInfo.lessonsPassed = Math.min(
        lessonsPassed,
        totalLessonsInCycle,
      );
      currentStatusInfo.lessonsLeft = Math.max(0, lessonsLeft);
      currentStatusInfo.totalLessons = totalLessonsInCycle;

      if (remainingMoney >= coursePrice) {
        currentStatusInfo.statusType = "paid";
        currentStatusInfo.isPaid = true;
        remainingMoney -= coursePrice;
        finalStatus = "paid";
        badgeText = "To'langan";
      } else {
        if (remainingMoney > 0) currentStatusInfo.paid = remainingMoney;

        if (lessonsPassed >= totalLessonsInCycle) {
          currentStatusInfo.statusType = "urgent";
          currentStatusInfo.text = "Bugun muddat tugaydi";
          finalStatus = "urgent";
          badgeText = "To'lov zarur";
        } else if (lessonsLeft === 1) {
          currentStatusInfo.statusType = "critical";
          currentStatusInfo.text = "Oxirgi dars qoldi";
          finalStatus = "critical";
          badgeText = "Oxirgi kun";
        } else if (lessonsLeft <= 3 && lessonsLeft > 0) {
          currentStatusInfo.statusType = "warning";
          currentStatusInfo.text = `${lessonsLeft} ta dars qoldi`;
          finalStatus = "warning";
          badgeText = "To'lov kerak";
        } else {
          currentStatusInfo.statusType = "new";
          finalStatus = "active";
          badgeText = "Faol";
        }
      }
    }

    if (debts.length > 0) {
      if (finalStatus === "urgent") {
        badgeText = "QARZ + TUGADI";
      } else {
        finalStatus = "expired";
        const months = debts.length;
        badgeText = months === 1 ? "1 oy qariz" : `${months} oy qariz`;
      }
    }

    const needNotification =
      (currentStatusInfo.lessonsLeft <= 3 &&
        currentStatusInfo.lessonsLeft >= 0) ||
      debts.length > 0 ||
      (activeCycle &&
        currentStatusInfo.lessonsPassed >= currentStatusInfo.totalLessons);

    return {
      totalPaid,
      balance: remainingMoney,
      debts,
      currentCycle: currentStatusInfo,
      status: finalStatus,
      badgeText,
      lastPayment: studentPayments[0] || null,
      coursePrice,
      needNotification,
      notificationType:
        debts.length > 0
          ? "debt"
          : currentStatusInfo.lessonsLeft === 0
            ? "deadline"
            : currentStatusInfo.lessonsLeft <= 3
              ? "reminder"
              : "none",
      isLastDay: currentStatusInfo.lessonsLeft === 0,
      isPaidForCurrentCycle: remainingMoney >= coursePrice,
    };
  };

  // Bu funksiya PaymentModal komponentida ishlatilmaydi, lekin boshqa joylarda kerak bo'lishi mumkin
  const sendPaymentSuccessNotification = useCallback(
    async (student, paymentData) => {
      if (!student.telegramId) return;

      const studentName = student.studentName || student.firstName || "";
      const studentLastName = student.lastName || "";
      const formattedDate = formatDateToUzbek(paymentData.date);

      const message = `✅ <b>TO'LOV QABUL QILINDI</b>

👤 ${studentName} ${studentLastName}
💰 Summa: <b>${formatMoney(paymentData.amount)}</b>
📅 Sana: <b>${formattedDate}</b>
🏷 Tur: <b>${paymentData.type === "debt" ? "Qarz to'lovi" : "Joriy to'lov"}</b>

✨ To'lovingiz uchun rahmat!`;

      try {
        const response = await fetch(
          "http://localhost:8000/send-notifications",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              notifications: [
                {
                  telegramId: student.telegramId,
                  studentName: `${studentName} ${studentLastName}`.trim(),
                  message: message,
                  groupId: selectedGroupId,
                  studentId: student.id,
                  notificationType: "payment_success",
                },
              ],
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
                  student: `${studentName} ${studentLastName}`.trim(),
                  type: "payment_confirmation",
                  status: "success",
                },
              ],
              type: "payment",
            },
            ...prev.slice(0, 9),
          ]);
        }
      } catch (error) {
        console.error("Payment notification error:", error);
      }
    },
    [
      selectedGroupId,
      todayStr,
      formatMoney,
      setNotificationLog,
      formatDateToUzbek,
    ],
  );

  const handlePaymentSubmit = useCallback(
    async (
      selectedStudent,
      amount,
      paymentDate,
      paymentType,
      selectedDebtCycleIndex,
      setLoading,
      setShowModal,
      setAmount,
      // BU PARAMETR Endi ishlatilmaydi, lekin API ni buzmaslik uchun qoldirilgan
      sendPaymentSuccessNotificationCallback,
    ) => {
      if (!amount || Number(amount) <= 0) {
        toast.error("Summani kiriting!");
        return false;
      }
      if (!paymentDate) {
        toast.error("Sanani tanlang!");
        return false;
      }

      setLoading(true);
      try {
        let note = "";
        if (paymentType === "debt" && selectedDebtCycleIndex !== null) {
          const debt = selectedStudent.info.debts[selectedDebtCycleIndex];
          const dStart = formatDateToUzbek(debt.startDate);
          const dEnd = formatDateToUzbek(debt.endDate);
          note = `Qarz to'lovi: ${dStart} — ${dEnd}`;
        } else {
          note = "Joriy to'lov";
        }

        const paymentData = {
          studentId: selectedStudent.id,
          studentName: (
            selectedStudent.studentName ||
            `${selectedStudent.firstName} ${selectedStudent.lastName}`
          ).trim(),
          groupId: selectedGroupId,
          groupName:
            groups.find((g) => g.id === selectedGroupId)?.groupName ||
            "Noma'lum",
          amount: Number(amount),
          date: paymentDate,
          createdAt: serverTimestamp(),
          type: paymentType,
          note: note,
          formattedDate: formatDateToUzbek(paymentDate),
        };

        // Faqat to'lovni saqlaymiz, xabar yuborilmaydi
        await addDoc(collection(db, "payments"), paymentData);

        // MUHIM: Bu qatorni o'chirib tashladik!
        // Xabar endi PaymentModal komponentida yuboriladi
        // await sendPaymentSuccessNotification(selectedStudent, paymentData);

        toast.success("To'lov qabul qilindi!");
        setShowModal(false);
        setAmount("");
        return true;
      } catch (e) {
        toast.error("Xatolik: " + e.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [selectedGroupId, groups, formatDateToUzbek],
  );

  return {
    formatMoney,
    calculateStudentStatus,
    sendPaymentSuccessNotification, // Bu funksiya boshqa joylarda ishlatilishi mumkin
    handlePaymentSubmit,
  };
};
