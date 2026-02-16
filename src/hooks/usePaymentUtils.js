import { useCallback } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { toast } from "react-toastify";

export const usePaymentUtils = (
  selectedGroupId,
  groups,
  todayStr,
  setNotificationLog,
) => {
  const formatMoney = (num) =>
    new Intl.NumberFormat("uz-UZ", {
      style: "currency",
      currency: "UZS",
      minimumFractionDigits: 0,
    }).format(num);

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

    // Generate cycles (12 lessons each)
    let cycles = [];
    let cycleLessonCount = 0;
    let tempDate = new Date(startDate);
    const limitDate = new Date();
    limitDate.setFullYear(limitDate.getFullYear() + 2);

    let currentCycleObj = {
      index: 1,
      startDate: new Date(startDate),
      endDate: null,
      lessons: 0,
      isActive: false,
    };

    while (tempDate <= limitDate) {
      if (targetDays.includes(tempDate.getDay())) {
        cycleLessonCount++;

        if (cycleLessonCount === 12) {
          currentCycleObj.endDate = new Date(tempDate);
          currentCycleObj.lessons = 12;
          cycles.push({ ...currentCycleObj });

          cycleLessonCount = 0;
          currentCycleObj = {
            index: cycles.length + 1,
            startDate: new Date(tempDate),
            endDate: null,
            lessons: 0,
            isActive: false,
          };
          currentCycleObj.startDate.setDate(
            currentCycleObj.startDate.getDate() + 1,
          );
        }
      }
      if (tempDate.getTime() === todayDate.getTime()) {
        currentCycleObj.isActive = true;
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }

    // Calculate balance and debts
    let remainingMoney = totalPaid;
    let debts = [];

    const passedCycles = cycles.filter(
      (c) => c.endDate && c.endDate < todayDate,
    );
    let activeCycle = cycles.find(
      (c) => c.startDate <= todayDate && (!c.endDate || c.endDate >= todayDate),
    );

    passedCycles.forEach((cycle) => {
      if (remainingMoney >= coursePrice) {
        cycle.status = "paid";
        remainingMoney -= coursePrice;
      } else if (remainingMoney > 0) {
        cycle.status = "partial";
        cycle.paidAmount = remainingMoney;
        cycle.debtAmount = coursePrice - remainingMoney;
        remainingMoney = 0;
        debts.push(cycle);
      } else {
        cycle.status = "unpaid";
        cycle.debtAmount = coursePrice;
        debts.push(cycle);
      }
    });

    // Calculate current cycle status
    let currentStatusInfo = {
      lessonsPassed: 0,
      totalLessons: 12,
      statusType: "new",
      text: "Jarayonda",
      isPaid: false,
      lessonsLeft: 12,
    };

    let finalStatus = "active";
    let badgeText = "Yangi / Kutilmoqda";

    if (activeCycle) {
      let dCounter = 0;
      let dTemp = new Date(activeCycle.startDate);
      while (dTemp <= todayDate) {
        if (targetDays.includes(dTemp.getDay())) dCounter++;
        dTemp.setDate(dTemp.getDate() + 1);
      }
      if (dCounter > 12) dCounter = 12;

      const lessonsLeft = 12 - dCounter;
      currentStatusInfo.lessonsPassed = dCounter;
      currentStatusInfo.lessonsLeft = lessonsLeft;

      if (remainingMoney >= coursePrice) {
        currentStatusInfo.statusType = "paid";
        currentStatusInfo.isPaid = true;
        remainingMoney -= coursePrice;
        finalStatus = "paid";
        badgeText = "To'langan";
      } else {
        if (remainingMoney > 0) currentStatusInfo.paid = remainingMoney;

        if (dCounter === 12) {
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
      if (finalStatus === "urgent") badgeText = "QARZ + TUGADI";
      else {
        finalStatus = "expired";
        badgeText = `${debts.length} Oy qariz`;
      }
    }

    return {
      totalPaid,
      balance: remainingMoney,
      debts,
      currentCycle: currentStatusInfo,
      status: finalStatus,
      badgeText,
      lastPayment: studentPayments[0] || null,
      coursePrice,
      needNotification:
        (currentStatusInfo.lessonsLeft <= 3 &&
          currentStatusInfo.lessonsLeft >= 0) ||
        debts.length > 0,
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

  const sendPaymentSuccessNotification = useCallback(
    async (student, paymentData) => {
      if (!student.telegramId) return;

      const studentName = student.studentName || student.firstName || "";
      const studentLastName = student.lastName || "";
      const formattedDate = new Date(paymentData.date).toLocaleDateString(
        "uz-UZ",
      );

      const message = `Assalomu alaykum ${studentName} ${studentLastName}! Siz ${formatMoney(
        paymentData.amount,
      )} miqdorida to'lov amalga oshirdingiz. To'lov sanasi: ${formattedDate}. Rahmat!`;

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
              date: new Date().toLocaleTimeString(),
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
    [selectedGroupId, todayStr, formatMoney, setNotificationLog],
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
      sendPaymentSuccessNotification,
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
          const dStart = debt.startDate.toLocaleDateString("uz-UZ");
          const dEnd = debt.endDate.toLocaleDateString("uz-UZ");
          note = `Qarz to'lovi: ${dStart} - ${dEnd}`;
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
        };

        await addDoc(collection(db, "payments"), paymentData);
        await sendPaymentSuccessNotification(selectedStudent, paymentData);

        toast.success("To'lov qabul qilindi va xabar yuborildi!");
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
    [selectedGroupId, groups],
  );

  return {
    formatMoney,
    calculateStudentStatus,
    sendPaymentSuccessNotification,
    handlePaymentSubmit,
  };
};
