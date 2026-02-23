import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { toast } from "react-toastify";
import {
  FiCalendar,
  FiDollarSign,
  FiUsers,
  FiAlertTriangle,
  FiUserCheck,
  FiMessageSquare,
  FiUmbrella,
} from "react-icons/fi";
import { useSelector, useDispatch } from "react-redux";

// Import components
import StatCard from "../../components/StatCard";
import NotificationLog from "../../components/NotificationLog";
import Filters from "../../components/Filters";
import StudentTable from "../../components/StudentTable";
import ManualMessageModal from "../../components/ManualMessageModal";
import PaymentModal from "../../components/PaymentModal";
import HolidayModal from "../../components/HolidayModal";
// HolidayEndModal olib tashlandi - endi ishlatilmaydi

// Import custom hooks
import { usePaymentUtils } from "../../hooks/usePaymentUtils";
import { useNotificationUtils } from "../../hooks/useNotificationUtils";
import { useHolidayUtils } from "../../hooks/useHolidayUtils";
import { useUzbekTime } from "../../hooks/useUzbekTime";
import { sendNotifications } from "../../utils/sendNotification";
import { addNotification } from "../../createSlice/notificationSlice";

const AddPayments = () => {
  const dispatch = useDispatch();

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
  const [msgStudentsList, setMsgStudentsList] = useState([]);
  const [msgStudentId, setMsgStudentId] = useState("");
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Holiday Modal State
  const [showHolidayModal, setShowHolidayModal] = useState(false);

  // Notification Log State
  const [notificationLog, setNotificationLog] = useState([]);
  const theme = useSelector((state) => state.theme.value);

  // Uzbek Time hook
  const { todayStr, formatUzbekDateReadable } = useUzbekTime();

  const today = new Date().toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // --- HOLIDAY UTILS ---
  const {
    holidays,
    activeHolidays,
    // showHolidayEndModal, setShowHolidayEndModal, endedHoliday, setEndedHoliday - OLIB TASHLANDI
    isHoliday,
    sendHolidayStartNotifications,
    sendHolidayEndNotifications,
    formatDateToUzbek,
    formatDateForBackend,
  } = useHolidayUtils(selectedGroupId);

  // --- CUSTOM HOOKS ---
  const {
    formatMoney,
    calculateStudentStatus,
    sendPaymentSuccessNotification,
    handlePaymentSubmit: originalHandlePaymentSubmit,
  } = usePaymentUtils(
    selectedGroupId,
    groups,
    todayStr,
    setNotificationLog,
    isHoliday,
    formatDateToUzbek,
  );

  const {
    checkAndSendGlobalNotifications,
    handleSendManualMessage: originalHandleSendManualMessage,
  } = useNotificationUtils(
    formatMoney,
    calculateStudentStatus,
    setNotificationLog,
    formatDateToUzbek,
  );

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

  // --- GLOBAL AUTOMATIC NOTIFICATION SENDER ---
  useEffect(() => {
    const timer = setTimeout(() => {
      checkAndSendGlobalNotifications();
    }, 3000);

    return () => clearTimeout(timer);
  }, [checkAndSendGlobalNotifications]);

  // --- MEMOIZED DATA ---
  const calculatedStudents = useMemo(() => {
    const selectedGroup = groups.find((g) => g.id === selectedGroupId);
    return students.map((student) => {
      const info = calculateStudentStatus(student, selectedGroup, payments);
      return { ...student, info };
    });
  }, [students, payments, selectedGroupId, groups, calculateStudentStatus]);

  // Statistics
  const activeStudents = calculatedStudents.filter((s) =>
    ["active", "paid", "warning"].includes(s.info?.status),
  ).length;

  const debtStudents = calculatedStudents.filter((s) =>
    ["expired", "critical", "urgent"].includes(s.info?.status),
  );

  const totalRevenue = payments
    .filter((p) => p.groupId === selectedGroupId)
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  // Check if current group has active holiday
  const hasActiveHoliday = activeHolidays.length > 0;

  // --- HANDLERS ---
  const openPaymentModal = (student) => {
    setSelectedStudent(student);
    const now = new Date();
    setPaymentDate(now.toISOString().split("T")[0]);
    setAmount(student.info?.coursePrice || "");

    if (student.info?.debts?.length > 0) {
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
    if (selectedStudent && selectedStudent.info?.debts?.[index]) {
      setAmount(selectedStudent.info.debts[index].debtAmount);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Summani kiriting!");
      return;
    }
    if (!paymentDate) {
      toast.error("Sanani tanlang!");
      return;
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

      const selectedGroup = groups.find((g) => g.id === selectedGroupId);

      const paymentData = {
        studentId: selectedStudent.id,
        studentName: (
          selectedStudent.studentName ||
          `${selectedStudent.firstName || ""} ${selectedStudent.lastName || ""}`
        ).trim(),
        groupId: selectedGroupId,
        groupName: selectedGroup?.groupName || "Noma'lum",
        amount: Number(amount),
        date: paymentDate,
        createdAt: new Date(),
        type: paymentType,
        note: note,
        formattedDate: formatDateToUzbek(paymentDate),
      };

      // Save to Firebase
      await originalHandlePaymentSubmit(
        selectedStudent,
        amount,
        paymentDate,
        paymentType,
        selectedDebtCycleIndex,
        setLoading,
        setShowModal,
        setAmount,
        sendPaymentSuccessNotification,
      );
    } catch (e) {
      console.error("Payment error:", e);
      toast.error("Xatolik: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendManualMessage = async () => {
    if (!msgGroupId || !msgStudentId || !msgText.trim()) {
      toast.warning("Barcha maydonlarni to'ldiring!");
      return;
    }

    const targetStudent = msgStudentsList.find((s) => s.id === msgStudentId);
    if (!targetStudent?.telegramId) {
      toast.error("Bu o'quvchida Telegram ID yo'q!");
      return;
    }

    setSendingMsg(true);

    const studentName =
      targetStudent.studentName || targetStudent.firstName || "";
    const studentLastName = targetStudent.lastName || "";
    const fullName = `${studentName} ${studentLastName}`.trim();

    try {
      const selectedGroup = groups.find((g) => g.id === msgGroupId);

      const message = msgText;

      const result = await sendNotifications(
        [
          {
            telegramId: targetStudent.telegramId,
            studentName: fullName,
            message: message,
            groupId: msgGroupId,
            groupName: selectedGroup?.groupName || "Noma'lum",
            studentId: msgStudentId,
            notificationType: "manual_message",
          },
        ],
        {
          showToast: true,
          toastSuccess: "Xabar yuborildi",
          toastError: "Xabar yuborilmadi",
        },
      );

      if (result.success) {
        setNotificationLog((prev) => [
          {
            date: formatDateToUzbek(new Date().toISOString()),
            count: 1,
            details: [
              {
                student: fullName,
                type: "manual",
                status: "success",
              },
            ],
            type: "manual",
          },
          ...prev.slice(0, 9),
        ]);

        setShowMsgModal(false);
        setMsgText("");
        setMsgStudentId("");
        setMsgGroupId("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Xatolik yuz berdi");
    } finally {
      setSendingMsg(false);
    }
  };

  const onHolidayCreated = async (holidayData, students) => {
    await sendHolidayStartNotifications(holidayData, students);
  };

  return (
    <>
      <div
        className={`${theme === "light" ? "bg-linear-to-br from-gray-50 via-slate-100/70 to-slate-200/30" : "bg-linear-to-br from-gray-800 via-slate-700/30 to-slate-800/30"} flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-5 px-4 rounded-2xl mb-5`}
      >
        <div>
          <h1
            className={`${theme === "light" ? "text-gray-500" : "text-gray-300"} text-2xl font-black tracking-tight`}
          >
            To'lovlar boshqaruvi
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500 flex items-center gap-2 font-medium">
              <FiCalendar className="text-blue-500" /> {today}
            </p>
            {hasActiveHoliday && (
              <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <FiUmbrella /> Tatil ({activeHolidays.length})
              </span>
            )}
          </div>
        </div>

        {/* BUTTONLAR */}
        <div className="flex items-center gap-2">
          {/* TATIL BELGILASH TUGMASI */}
          <button
            onClick={() => setShowHolidayModal(true)}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold shadow-lg transition-all ${
              theme === "light"
                ? "active:scale-95 bg-white text-purple-600 hover:bg-purple-50 border border-purple-100"
                : "active:scale-95 bg-[#1e2839d4] text-purple-300 hover:bg-slate-800 border border-slate-400/30"
            }`}
          >
            <FiUmbrella className="text-xl" />
            <span>Tatil belgilash</span>
          </button>

          {/* XABAR YUBORISH TUGMASI */}
          <button
            onClick={() => setShowMsgModal(true)}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold shadow-lg transition-all ${
              theme === "light"
                ? "active:scale-95 bg-white text-blue-600 hover:bg-blue-50 border border-blue-100"
                : "active:scale-95 bg-[#1e2839d4] text-blue-300 hover:bg-slate-800 border border-slate-400/30"
            }`}
          >
            <FiMessageSquare className="text-xl" />
            <span>Xabar yuborish</span>
          </button>
        </div>
      </div>

      <div
        className={`min-h-screen p-4 md:p-8 font-sans ${
          theme === "light"
            ? "bg-[#F8FAFC] text-slate-900"
            : "bg-linear-to-br from-gray-900 via-slate-800/30 to-slate-900/30 text-slate-100"
        } rounded-2xl`}
      >
        {/* HEADER */}
        <div className="mb-10">
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-5">
            <StatCard
              icon={<FiUsers />}
              label="Jami O'quvchilar"
              value={students.length}
              color="blue"
            />
            <StatCard
              icon={<FiUserCheck />}
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

          {/* NOTIFICATION LOG */}
          <NotificationLog notificationLog={notificationLog} theme={theme} />
        </div>

        {/* FILTERS */}
        <Filters
          theme={theme}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedGroupId={selectedGroupId}
          setSelectedGroupId={setSelectedGroupId}
          groups={groups}
        />

        {/* TABLE */}
        <StudentTable
          theme={theme}
          selectedGroupId={selectedGroupId}
          calculatedStudents={calculatedStudents}
          searchQuery={searchQuery}
          openPaymentModal={openPaymentModal}
          formatMoney={formatMoney}
        />

        {/* MODALLAR */}
        <ManualMessageModal
          showMsgModal={showMsgModal}
          setShowMsgModal={setShowMsgModal}
          groups={groups}
          msgGroupId={msgGroupId}
          setMsgGroupId={setMsgGroupId}
          msgStudentsList={msgStudentsList}
          msgStudentId={msgStudentId}
          setMsgStudentId={setMsgStudentId}
          msgText={msgText}
          setMsgText={setMsgText}
          handleSendManualMessage={handleSendManualMessage}
          sendingMsg={sendingMsg}
        />

        <HolidayModal
          showModal={showHolidayModal}
          setShowModal={setShowHolidayModal}
          groups={groups}
          onHolidayCreated={onHolidayCreated}
          formatDateToUzbek={formatDateToUzbek}
        />

        {/* HolidayEndModal butunlay olib tashlandi */}

        <PaymentModal
          showModal={showModal}
          setShowModal={setShowModal}
          selectedStudent={selectedStudent}
          paymentType={paymentType}
          setPaymentType={setPaymentType}
          selectedDebtCycleIndex={selectedDebtCycleIndex}
          handleDebtSelection={handleDebtSelection}
          amount={amount}
          setAmount={setAmount}
          paymentDate={paymentDate}
          setPaymentDate={setPaymentDate}
          handlePaymentSubmit={handlePaymentSubmit}
          loading={loading}
          formatMoney={formatMoney}
        />
      </div>
    </>
  );
};

export default AddPayments;
