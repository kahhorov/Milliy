import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase/firebase"; // Firebase yo'lini o'zingizga moslang
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FiSearch,
  FiX,
  FiCalendar,
  FiDollarSign,
  FiUsers,
  FiCheckCircle,
  FiAlertTriangle,
  FiAlertCircle,
  FiClock,
  FiBell,
  FiSend,
  FiMessageSquare,
} from "react-icons/fi";
import { FaTelegramPlane } from "react-icons/fa";

// --- UI COMPONENTS ---
const StatCard = ({ icon, label, value, color, isMoney, animate }) => {
  const styles = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    green: "text-emerald-600 bg-emerald-50 border-emerald-100",
    red: "text-red-600 bg-red-50 border-red-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    orange: "text-orange-600 bg-orange-50 border-orange-100",
  };

  return (
    <div
      className={`bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md 
      ${animate ? "ring-2 ring-red-400 animate-pulse bg-red-50" : ""}`}
    >
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border ${styles[color]}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          {label}
        </p>
        <p
          className={`font-black text-slate-800 ${
            isMoney ? "text-lg" : "text-3xl"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
};

const AddPayments = () => {
  // --- STATE ---
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Payment Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [selectedDebtCycleIndex, setSelectedDebtCycleIndex] = useState(null);
  const [paymentType, setPaymentType] = useState("regular");
  const [loading, setLoading] = useState(false);

  // Manual Message Modal State
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [msgGroupId, setMsgGroupId] = useState("");
  const [msgStudentsList, setMsgStudentsList] = useState([]); // Modal ichidagi studentlar
  const [msgStudentId, setMsgStudentId] = useState("");
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Notification Log State
  const [notificationLog, setNotificationLog] = useState([]);

  const today = new Date().toLocaleDateString("uz-UZ");
  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

  // --- FIREBASE DATA FETCHING ---
  useEffect(() => {
    const unsubGroups = onSnapshot(collection(db, "groups"), (snap) => {
      setGroups(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const qPayments = query(
      collection(db, "payments"),
      orderBy("createdAt", "desc"),
    );
    const unsubPayments = onSnapshot(qPayments, (snap) => {
      setPayments(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubGroups();
      unsubPayments();
    };
  }, []);

  // Fetch students for Main Table
  useEffect(() => {
    if (!selectedGroupId) {
      setStudents([]);
      return;
    }
    const unsubStudents = onSnapshot(
      collection(db, "groups", selectedGroupId, "students"),
      (snap) => {
        setStudents(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      },
    );
    return () => unsubStudents();
  }, [selectedGroupId]);

  // Fetch students for Message Modal when group changes
  useEffect(() => {
    const fetchModalStudents = async () => {
      if (!msgGroupId) {
        setMsgStudentsList([]);
        return;
      }
      try {
        const querySnapshot = await getDocs(
          collection(db, "groups", msgGroupId, "students"),
        );
        const list = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMsgStudentsList(list);
      } catch (error) {
        console.error("Error fetching students for modal:", error);
      }
    };
    fetchModalStudents();
  }, [msgGroupId]);

  // --- UTILITY FUNCTIONS ---
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

  // --- CALCULATION LOGIC ---
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
    if (!group || !student.createdAt) return { status: "unknown", info: {} };

    // 1. Student payments
    const studentPayments = allPayments.filter(
      (p) => p.studentId === student.id,
    );
    const totalPaid = studentPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const coursePrice = Number(group.coursePrice) || 0;

    // 2. Dates
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

    // 3. Generate cycles (12 lessons each)
    let cycles = [];
    let lessonCounter = 0;
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
        lessonCounter++;
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

    // 4. Calculate balance and debts
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

    // 5. Calculate current cycle status
    let currentStatusInfo = {
      lessonsPassed: 0,
      totalLessons: 12,
      statusType: "new",
      text: "Jarayonda",
      isPaid: false,
      lessonsLeft: 12,
    };

    let finalStatus = "active";
    let badgeText = "YANGI / KUTILMOQDA";

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
        badgeText = "TO'LANGAN";
      } else {
        if (remainingMoney > 0) currentStatusInfo.paid = remainingMoney;

        if (dCounter === 12) {
          currentStatusInfo.statusType = "urgent";
          currentStatusInfo.text = "Bugun muddat tugaydi";
          finalStatus = "urgent";
          badgeText = "TO'LOV ZARUR";
        } else if (lessonsLeft === 1) {
          currentStatusInfo.statusType = "critical";
          currentStatusInfo.text = "Oxirgi dars qoldi";
          finalStatus = "critical";
          badgeText = "OXIRGI KUN";
        } else if (lessonsLeft <= 3 && lessonsLeft > 0) {
          currentStatusInfo.statusType = "warning";
          currentStatusInfo.text = `${lessonsLeft} ta dars qoldi`;
          finalStatus = "warning";
          badgeText = "TO'LOV KERAK";
        } else {
          currentStatusInfo.statusType = "new";
          finalStatus = "active";
          badgeText = "FAOL";
        }
      }
    }

    if (debts.length > 0) {
      if (finalStatus === "urgent") badgeText = "QARZ + TUGADI";
      else {
        finalStatus = "expired";
        badgeText = `${debts.length} OY QARZ`;
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
    };
  };

  // --- MEMOIZED DATA ---
  const calculatedStudents = useMemo(() => {
    const selectedGroup = groups.find((g) => g.id === selectedGroupId);
    return students.map((student) => {
      const info = calculateStudentStatus(student, selectedGroup, payments);
      return { ...student, info };
    });
  }, [students, payments, selectedGroupId, groups]);

  // Statistics
  const activeStudents = calculatedStudents.filter((s) =>
    ["active", "paid", "warning"].includes(s.info.status),
  ).length;
  const debtStudents = calculatedStudents.filter((s) =>
    ["expired", "critical", "urgent"].includes(s.info.status),
  );
  const totalRevenue = payments
    .filter((p) => p.groupId === selectedGroupId)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  // --- 1. AUTOMATIC NOTIFICATION SENDER (EFFECT) ---
  useEffect(() => {
    const sendAutoNotifications = async () => {
      if (!selectedGroupId || calculatedStudents.length === 0) return;

      const notificationsToSend = [];
      const logEntries = [];

      calculatedStudents.forEach((student) => {
        const info = student.info;

        // Agar puli to'langan bo'lsa yoki notification kerak bo'lmasa -> return
        if (info.currentCycle.isPaid || !info.needNotification) return;

        // Bugun yuborilganmi?
        const storageKey = `notif_${student.id}_${todayStr}`;
        if (localStorage.getItem(storageKey)) return;

        // Telegram ID bormi?
        if (!student.telegramId) return;

        const lessonsLeft = info.currentCycle.lessonsLeft;
        const hasDebt = info.debts.length > 0;
        const totalDebt = info.debts.reduce((sum, d) => sum + d.debtAmount, 0);

        let message = "";
        let notificationType = "";

        if (hasDebt) {
          message = `Hurmatli o'quvchi, sizda to'lanmagan qarzdorlik mavjud (${formatMoney(
            totalDebt,
          )}). Iltimos, to'lovni amalga oshiring.`;
          notificationType = "debt";
        } else if (lessonsLeft === 0) {
          message = `Bugun to'lov muddatingiz tugadi. Darsni davom ettirish uchun to'lov qiling.`;
          notificationType = "deadline";
        } else {
          message = `Eslatma: Sizning to'lov muddatingiz tugashiga ${lessonsLeft} ta dars qoldi.`;
          notificationType = "reminder";
        }

        notificationsToSend.push({
          telegramId: student.telegramId,
          studentName:
            student.studentName || `${student.firstName} ${student.lastName}`,
          message: message,
          groupId: selectedGroupId,
          studentId: student.id,
          notificationType: notificationType,
        });

        logEntries.push({
          student: student.studentName || student.firstName,
          type: notificationType,
          status: "success",
        });
      });

      if (notificationsToSend.length === 0) return;

      try {
        // Backendga jo'natish
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
          // LocalStoragega yozish
          notificationsToSend.forEach((n) => {
            localStorage.setItem(`notif_${n.studentId}_${todayStr}`, "true");
          });

          // Loglarni yangilash (FAQAT YUBORILGANLAR)
          setNotificationLog((prev) => [
            {
              date: new Date().toLocaleTimeString(),
              count: notificationsToSend.length,
              details: logEntries,
            },
            ...prev.slice(0, 9), // Max 10 ta log
          ]);

          toast.info(
            `Avtomatik tizim: ${notificationsToSend.length} ta o'quvchiga eslatma yuborildi.`,
          );
        }
      } catch (error) {
        console.error("Auto notification error:", error);
      }
    };

    // 2 soniya kutib keyin yuboradi (UI yuklanishi uchun)
    const timer = setTimeout(() => {
      sendAutoNotifications();
    }, 2000);

    return () => clearTimeout(timer);
  }, [calculatedStudents, selectedGroupId, todayStr]);

  // --- 2. MANUAL MESSAGE HANDLER ---
  const handleSendManualMessage = async () => {
    if (!msgGroupId || !msgStudentId || !msgText.trim()) {
      return toast.warning("Barcha maydonlarni to'ldiring!");
    }

    const targetStudent = msgStudentsList.find((s) => s.id === msgStudentId);
    if (!targetStudent?.telegramId) {
      return toast.error("Bu o'quvchida Telegram ID yo'q!");
    }

    setSendingMsg(true);

    const manualPayload = {
      telegramId: targetStudent.telegramId,
      studentName:
        targetStudent.studentName ||
        `${targetStudent.firstName} ${targetStudent.lastName}`,
      message: msgText,
      groupId: msgGroupId,
      studentId: msgStudentId,
      notificationType: "manual_message",
    };

    try {
      const response = await fetch("http://localhost:8000/send-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifications: [manualPayload],
          date: todayStr,
        }),
      });

      if (response.ok) {
        setNotificationLog((prev) => [
          {
            date: new Date().toLocaleTimeString(),
            count: 1,
            details: [
              {
                student: manualPayload.studentName,
                type: "manual",
                status: "success",
              },
            ],
          },
          ...prev.slice(0, 9),
        ]);
        toast.success("Xabar muvaffaqiyatli yuborildi!");
        setShowMsgModal(false);
        setMsgText("");
        setMsgStudentId("");
      } else {
        toast.error("Xabar yuborishda xatolik bo'ldi.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Serverga ulanib bo'lmadi.");
    } finally {
      setSendingMsg(false);
    }
  };

  // --- PAYMENT MODAL HANDLERS ---
  const openPaymentModal = (student) => {
    setSelectedStudent(student);
    const now = new Date();
    setPaymentDate(now.toISOString().split("T")[0]);

    setAmount(student.info.coursePrice || "");

    if (student.info.debts.length > 0) {
      setPaymentType("debt");
      setSelectedDebtCycleIndex(0);
      setAmount(student.info.debts[0].debtAmount);
    } else {
      setPaymentType("regular");
      setSelectedDebtCycleIndex(null);
    }
    setShowModal(true);
  };

  const handleDebtSelection = (index) => {
    setSelectedDebtCycleIndex(index);
    if (selectedStudent && selectedStudent.info.debts[index]) {
      setAmount(selectedStudent.info.debts[index].debtAmount);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!amount || Number(amount) <= 0) return toast.error("Summani kiriting!");
    if (!paymentDate) return toast.error("Sanani tanlang!");

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

      await addDoc(collection(db, "payments"), {
        studentId: selectedStudent.id,
        studentName: (
          selectedStudent.studentName ||
          `${selectedStudent.firstName} ${selectedStudent.lastName}`
        ).trim(),
        groupId: selectedGroupId,
        groupName:
          groups.find((g) => g.id === selectedGroupId)?.groupName || "Noma'lum",
        amount: Number(amount),
        date: paymentDate,
        createdAt: serverTimestamp(),
        type: paymentType,
        note: note,
      });

      toast.success("To'lov qabul qilindi!");
      setShowModal(false);
      setAmount("");
    } catch (e) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- UI RENDER ---
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-900">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* HEADER */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800">
              To'lovlar Monitoringi
            </h1>
            <p className="text-slate-500 flex items-center gap-2 mt-1 font-medium">
              <FiCalendar className="text-blue-500" /> {today}
            </p>
          </div>

          {/* MANUAL MESSAGE BUTTON */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMsgModal(true)}
              className="flex items-center gap-3 px-6 py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 bg-white text-blue-600 hover:bg-blue-50 border border-blue-100"
            >
              <FiMessageSquare className="text-xl" />
              <span>Xabar yuborish</span>
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-5">
          <StatCard
            icon={<FiUsers />}
            label="Jami O'quvchilar"
            value={students.length}
            color="blue"
          />
          <StatCard
            icon={<FiCheckCircle />}
            label="Aktiv / To'lagan"
            value={activeStudents}
            color="green"
          />
          <StatCard
            icon={<FiAlertTriangle />}
            label="Diqqat Talab"
            value={debtStudents.length}
            color="red"
            animate={debtStudents.length > 0}
          />
          <StatCard
            icon={<FiDollarSign />}
            label="Guruh Tushumi"
            value={formatMoney(totalRevenue)}
            color="emerald"
            isMoney
          />
        </div>

        {/* NOTIFICATION LOG (CLEAN VERSION) */}
        {notificationLog.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl p-4 border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
              <FiBell /> So'nggi Xabarlar Tarixi
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              {notificationLog.map((log, idx) => (
                <div
                  key={idx}
                  className="text-sm border-l-4 border-blue-500 pl-3 py-2 bg-slate-50 rounded"
                >
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-500">
                      {log.date}
                    </span>
                    <span className="font-bold text-blue-600">
                      {log.count} ta xabar yuborildi
                    </span>
                  </div>
                  <div className="mt-1">
                    {log.details.map((detail, i) => (
                      <p
                        key={i}
                        className={`text-[11px] ${
                          detail.status === "success"
                            ? "text-slate-600"
                            : "text-red-500"
                        }`}
                      >
                        - {detail.student}:{" "}
                        {detail.type === "manual"
                          ? "Shaxsiy xabar"
                          : detail.type === "debt"
                            ? "Qarzdorlik eslatmasi"
                            : "Muddat eslatmasi"}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-3xl p-4 mb-8 flex flex-col md:flex-row gap-4 shadow-sm border border-slate-200">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="O'quvchi ismini qidiring..."
            className="w-full bg-slate-50 rounded-2xl py-4 pl-12 pr-4 outline-none font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          className="w-full md:w-72 bg-slate-50 rounded-2xl py-4 px-5 outline-none font-bold text-slate-700 cursor-pointer"
        >
          <option value="">Guruhni tanlang...</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.groupName}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-[32px] shadow-xl border border-slate-200 overflow-hidden">
        {!selectedGroupId ? (
          <div className="py-32 text-center text-slate-400">
            <FiUsers size={48} className="mx-auto mb-4 opacity-20" />
            <p>Iltimos, ishni boshlash uchun guruhni tanlang</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase text-slate-400 font-black tracking-widest">
                <tr>
                  <th className="py-6 px-8">O'quvchi</th>
                  <th className="py-6 px-6 text-center">
                    Joriy Holat (12 dars)
                  </th>
                  <th className="py-6 px-6 text-center">Status</th>
                  <th className="py-6 px-8 text-center">Qarzdorlik / Balans</th>
                  <th className="py-6 px-8 text-center">Eslatma</th>
                  <th className="py-6 px-8 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {calculatedStudents
                  .filter((s) =>
                    (s.studentName || s.firstName || "")
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()),
                  )
                  .map((student) => {
                    const info = student.info;
                    const isUrgent = info.status === "urgent";
                    const isCritical = info.status === "critical";
                    const isWarning = info.status === "warning";
                    const isExpired = info.status === "expired";
                    const needsNotification = info.needNotification;
                    const hasTelegramId = !!student.telegramId;

                    return (
                      <tr
                        key={student.id}
                        className={`hover:bg-slate-50/50 transition-all duration-300 ${
                          isUrgent ? "bg-red-50/30" : ""
                        }`}
                      >
                        {/* Name */}
                        <td className="py-5 px-8">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg 
                              ${
                                isUrgent
                                  ? "bg-red-100 text-red-600 animate-pulse"
                                  : "bg-blue-100 text-blue-600"
                              }`}
                            >
                              {(
                                student.studentName ||
                                student.firstName ||
                                "?"
                              ).charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 flex items-center gap-2">
                                {student.studentName ||
                                  `${student.firstName} ${student.lastName}`}
                                {hasTelegramId ? (
                                  <FaTelegramPlane
                                    className="text-blue-500 text-xs"
                                    title="Telegram ulangan"
                                  />
                                ) : (
                                  <FaTelegramPlane
                                    className="text-slate-300 text-xs"
                                    title="Telegram ulanmagan"
                                  />
                                )}
                              </p>
                              <p className="text-xs text-slate-400">
                                {student.phoneNumber}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Progress Bar */}
                        <td className="py-5 px-6 text-center">
                          <div
                            className={`text-sm font-black mb-1 
                            ${
                              isUrgent
                                ? "text-red-600 animate-bounce"
                                : isCritical
                                  ? "text-red-500"
                                  : isWarning
                                    ? "text-orange-500"
                                    : "text-slate-700"
                            }`}
                          >
                            {isUrgent
                              ? "BUGUN MUDDAT TUGAYDI"
                              : `${info.currentCycle.lessonsPassed} / 12 dars`}
                          </div>
                          <div className="w-32 h-2 bg-slate-200 rounded-full mx-auto overflow-hidden relative">
                            <div
                              className={`h-full rounded-full transition-all duration-500 
                              ${
                                info.currentCycle.isPaid
                                  ? "bg-emerald-500"
                                  : isUrgent
                                    ? "bg-red-600 w-full animate-pulse"
                                    : isCritical
                                      ? "bg-red-500"
                                      : isWarning
                                        ? "bg-orange-400"
                                        : "bg-blue-500"
                              }`}
                              style={{
                                width: isUrgent
                                  ? "100%"
                                  : `${
                                      (info.currentCycle.lessonsPassed / 12) *
                                      100
                                    }%`,
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {info.currentCycle.lessonsLeft} dars qoldi
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-5 px-6 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm border
                            ${
                              isUrgent
                                ? "bg-red-600 text-white border-red-600 animate-pulse"
                                : isCritical
                                  ? "bg-red-100 text-red-600 border-red-200"
                                  : isWarning
                                    ? "bg-orange-100 text-orange-600 border-orange-200"
                                    : isExpired
                                      ? "bg-rose-100 text-rose-700 border-rose-200"
                                      : info.status === "paid"
                                        ? "bg-emerald-100 text-emerald-600 border-emerald-200"
                                        : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            {isUrgent && <FiAlertCircle size={12} />}
                            {info.badgeText}
                          </span>
                        </td>

                        {/* Money / Debt */}
                        <td className="py-5 px-8 text-center">
                          {info.debts.length > 0 ? (
                            <div className="flex flex-col items-center">
                              <span className="text-red-600 font-bold text-sm">
                                -{" "}
                                {formatMoney(
                                  info.debts.reduce(
                                    (a, b) => a + b.debtAmount,
                                    0,
                                  ),
                                )}
                              </span>
                              <span className="text-[9px] text-red-400 font-bold uppercase">
                                Qarzdorlik
                              </span>
                            </div>
                          ) : info.balance > 0 ? (
                            <div className="flex flex-col items-center">
                              <span className="text-emerald-600 font-bold text-sm">
                                + {formatMoney(info.balance)}
                              </span>
                              <span className="text-[9px] text-emerald-400 font-bold uppercase">
                                Balansda bor
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs font-medium">
                              0 UZS
                            </span>
                          )}
                        </td>

                        {/* Notification Indicator */}
                        <td className="py-5 px-8 text-center">
                          {needsNotification ? (
                            <div className="flex flex-col items-center">
                              {hasTelegramId ? (
                                <>
                                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                  <span className="text-[10px] text-red-500 font-bold mt-1">
                                    AVTO YUBORILISHI KERAK
                                  </span>
                                </>
                              ) : (
                                <>
                                  <div className="w-3 h-3 bg-slate-300 rounded-full"></div>
                                  <span className="text-[10px] text-slate-400 font-bold mt-1">
                                    ID YO'Q
                                  </span>
                                </>
                              )}
                            </div>
                          ) : info.currentCycle.isPaid ? (
                            <div className="flex flex-col items-center">
                              <FiCheckCircle className="text-emerald-500" />
                              <span className="text-[10px] text-emerald-500 font-bold mt-1">
                                TO'LANGAN
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-5 px-8 text-right">
                          <button
                            onClick={() => openPaymentModal(student)}
                            className={`p-3 rounded-2xl border transition-all shadow-sm active:scale-95
                            ${
                              isUrgent || isCritical || isExpired
                                ? "bg-red-600 border-red-600 text-white shadow-red-200 hover:bg-red-700 hover:shadow-lg animate-pulse"
                                : isWarning
                                  ? "bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                            }`}
                          >
                            <FiDollarSign size={20} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MANUAL MESSAGE MODAL --- */}
      {showMsgModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in duration-200 overflow-hidden relative">
            <div className="px-8 py-6 border-b bg-slate-50 border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800">
                  Xabar Yuborish
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  Bot orqali shaxsiy xabar
                </p>
              </div>
              <button
                onClick={() => setShowMsgModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="p-8 space-y-5">
              {/* Group Select */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">
                  Guruhni Tanlang
                </label>
                <div className="relative">
                  <select
                    value={msgGroupId}
                    onChange={(e) => {
                      setMsgGroupId(e.target.value);
                      setMsgStudentId(""); // Guruh o'zgarsa student reset
                    }}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl py-4 px-4 font-bold text-slate-700 outline-none transition-all cursor-pointer max-h-40 overflow-y-auto"
                  >
                    <option value="">Tanlang...</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.groupName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Student Select (Only shows if group is selected) */}
              {msgGroupId && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">
                    O'quvchini Tanlang
                  </label>
                  <div className="relative">
                    <select
                      value={msgStudentId}
                      onChange={(e) => setMsgStudentId(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl py-4 px-4 font-bold text-slate-700 outline-none transition-all cursor-pointer"
                    >
                      <option value="">Tanlang...</option>
                      {msgStudentsList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.studentName || `${s.firstName} ${s.lastName}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Message Textarea */}
              {msgStudentId && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">
                    Xabar Matni
                  </label>
                  <textarea
                    rows={4}
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    placeholder="Xabaringizni yozing..."
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-4 font-medium outline-none transition-all resize-none"
                  ></textarea>
                </div>
              )}

              <button
                onClick={handleSendManualMessage}
                disabled={sendingMsg || !msgText || !msgStudentId}
                className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl text-white transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 ${
                  sendingMsg
                    ? "bg-slate-400 cursor-wait"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                }`}
              >
                {sendingMsg ? (
                  "Yuborilmoqda..."
                ) : (
                  <>
                    <FiSend /> Yuborish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PAYMENT MODAL --- */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in duration-200 overflow-hidden relative">
            <div
              className={`px-8 py-6 border-b flex justify-between items-center ${
                selectedStudent.info.status === "urgent"
                  ? "bg-red-50 border-red-100"
                  : "bg-slate-50 border-slate-100"
              }`}
            >
              <div>
                <h3 className="text-xl font-black text-slate-800">
                  To'lov Qabul Qilish
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  {selectedStudent.studentName || selectedStudent.firstName}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                {selectedStudent.info.debts.length > 0 && (
                  <button
                    onClick={() => setPaymentType("debt")}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                      paymentType === "debt"
                        ? "bg-white shadow-md text-red-600"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Qarzni Yopish
                  </button>
                )}
                <button
                  onClick={() => {
                    setPaymentType("regular");
                    setAmount(selectedStudent.info.coursePrice);
                  }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                    paymentType === "regular"
                      ? "bg-white shadow-md text-blue-600"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Joriy To'lov
                </button>
              </div>

              {paymentType === "debt" &&
                selectedStudent.info.debts.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase ml-1">
                      Qarzni Tanlang
                    </label>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {selectedStudent.info.debts.map((debt, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleDebtSelection(idx)}
                          className={`p-4 rounded-2xl border cursor-pointer flex justify-between items-center transition-all ${
                            selectedDebtCycleIndex === idx
                              ? "bg-red-50 border-red-500 ring-1 ring-red-500"
                              : "bg-white border-slate-200 hover:border-red-300"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">
                              {debt.startDate.toLocaleDateString("uz-UZ")} —{" "}
                              {debt.endDate.toLocaleDateString("uz-UZ")}
                            </p>
                            <p className="text-[10px] text-red-400 font-medium">
                              To'lanmagan davr
                            </p>
                          </div>
                          <span className="font-black text-slate-800">
                            {formatMoney(debt.debtAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">
                    Summa
                  </label>
                  <div className="relative">
                    <FiDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl py-4 pl-10 pr-4 text-xl font-bold outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">
                    To'lov Sanasi
                  </label>
                  <div className="relative">
                    <FiClock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl py-4 pl-10 pr-4 font-medium outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handlePaymentSubmit}
                disabled={loading}
                className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl text-white transition-all active:scale-95 disabled:opacity-70 ${
                  selectedStudent.info.status === "urgent"
                    ? "bg-red-600 hover:bg-red-700 shadow-red-200"
                    : "bg-slate-900 hover:bg-slate-800 shadow-slate-200"
                }`}
              >
                {loading ? "Saqlanmoqda..." : "To'lovni Tasdiqlash"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddPayments;
