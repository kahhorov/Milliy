import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FiCalendar,
  FiDollarSign,
  FiUsers,
  FiAlertTriangle,
  FiUserCheck,
  FiMessageSquare,
} from "react-icons/fi";
import { useSelector } from "react-redux";

// Import components
import StatCard from "../../components/StatCard";
import NotificationLog from "../../components/NotificationLog";
import Filters from "../../components/Filters";
import StudentTable from "../../components/StudentTable";
import ManualMessageModal from "../../components/ManualMessageModal";
import PaymentModal from "../../components/PaymentModal";

// Import custom hooks
import { usePaymentUtils } from "../../hooks/usePaymentUtils";
import { useNotificationUtils } from "../../hooks/useNotificationUtils";

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
  const [msgStudentsList, setMsgStudentsList] = useState([]);
  const [msgStudentId, setMsgStudentId] = useState("");
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Notification Log State
  const [notificationLog, setNotificationLog] = useState([]);
  const theme = useSelector((state) => state.theme.value);

  const today = new Date().toLocaleDateString("uz-UZ");
  const todayStr = new Date().toLocaleDateString("en-CA");

  // --- CUSTOM HOOKS ---
  const {
    formatMoney,
    calculateStudentStatus,
    sendPaymentSuccessNotification,
    handlePaymentSubmit,
  } = usePaymentUtils(selectedGroupId, groups, todayStr, setNotificationLog);

  const { checkAndSendGlobalNotifications, handleSendManualMessage } =
    useNotificationUtils(
      formatMoney,
      calculateStudentStatus,
      setNotificationLog,
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
    ["active", "paid", "warning"].includes(s.info.status),
  ).length;
  const debtStudents = calculatedStudents.filter((s) =>
    ["expired", "critical", "urgent"].includes(s.info.status),
  );
  const totalRevenue = payments
    .filter((p) => p.groupId === selectedGroupId)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  // --- HANDLERS ---
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

  const onPaymentSubmit = () => {
    handlePaymentSubmit(
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
  };

  const onSendManualMessage = () => {
    handleSendManualMessage(
      msgGroupId,
      msgStudentId,
      msgText,
      msgStudentsList,
      todayStr,
      setSendingMsg,
      setShowMsgModal,
      setMsgText,
      setMsgStudentId,
    );
  };

  return (
    <div
      className={`min-h-screen p-4 md:p-8 font-sans ${theme === "light" ? "bg-[#F8FAFC] text-slate-900" : "bg-[#0F131A] text-slate-100"}`}
    >
      <ToastContainer position="top-right" autoClose={3000} />

      {/* HEADER */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
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
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold shadow-lg transition-all ${theme === "light" ? "active:scale-95 bg-white text-blue-600 hover:bg-blue-50 border border-blue-100" : "active:scale-95 bg-[#1e2839d4] text-blue-300 hover:bg-slate-800 border border-slate-400/30 cursor-pointer"}`}
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

      {/* MANUAL MESSAGE MODAL */}
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
        handleSendManualMessage={onSendManualMessage}
        sendingMsg={sendingMsg}
      />

      {/* PAYMENT MODAL */}
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
        handlePaymentSubmit={onPaymentSubmit}
        loading={loading}
        formatMoney={formatMoney}
      />
    </div>
  );
};

export default AddPayments;
