import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FiSearch,
  FiX,
  FiCreditCard,
  FiCalendar,
  FiDollarSign,
  FiUsers,
  FiCheckCircle,
  FiAlertTriangle,
  FiUserCheck,
  FiUserX,
} from "react-icons/fi";

const AddPayments = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState("");

  const today = new Date().toLocaleDateString("uz-UZ");

  // Inglizcha kunlarni raqamga o'girish
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

  // 1. Firebase Data Fetching
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

  // 2. Fetch Group Students
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

  // 3. Modal ochilganda date va summani avtomatik to'ldirish
  useEffect(() => {
    if (showModal && selectedStudent && selectedGroupId) {
      // Bugungi sana
      const today = new Date();
      const formattedDate = today.toISOString().split("T")[0];
      setPaymentDate(formattedDate);

      // Group coursePrice ni olish
      const selectedGroup = groups.find((g) => g.id === selectedGroupId);
      if (selectedGroup && selectedGroup.coursePrice) {
        setAmount(selectedGroup.coursePrice.toString());
      }
    }
  }, [showModal, selectedStudent, selectedGroupId, groups]);

  // --- YANGI: KATTA RAQAMLARNI FORMATLASH ---
  const formatLargeNumber = (num) => {
    if (!num && num !== 0) return "0";

    const number = Number(num);
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1).replace(/\.0$/, "") + " Mln";
    } else if (number >= 1000) {
      return (number / 1000).toFixed(1).replace(/\.0$/, "") + " ming";
    }
    return number.toString();
  };

  // --- ASOSIY LOGIKA: Darslarni hisoblash ---
  const calculateLessons = (createdAt, groupDays, studentId) => {
    // 1. Sana formatini to'g'irlash
    let startDate;
    if (createdAt && createdAt.seconds) {
      startDate = new Date(createdAt.seconds * 1000);
    } else if (createdAt) {
      startDate = new Date(createdAt);
    } else {
      startDate = new Date(); // Fallback
    }

    // Soatni 00:00 ga tushiramiz
    startDate.setHours(0, 0, 0, 0);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    // 2. Shu o'quvchining oxirgi to'lovini topish
    const studentPayments = payments.filter((p) => p.studentId === studentId);
    let lastPayment = null;
    let lastPaymentAmount = 0;

    if (studentPayments.length > 0) {
      // Sanasi bo'yicha saralash (eng yangisi birinchi)
      studentPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
      lastPayment = studentPayments[0];
      lastPaymentAmount = lastPayment ? Number(lastPayment.amount) : 0;
    }

    // 3. Hisoblash boshi (Start Point)
    let calculationStartDate = lastPayment
      ? new Date(lastPayment.date)
      : startDate;

    calculationStartDate.setHours(0, 0, 0, 0);

    // 4. Guruh kunlarini aniqlash
    let targetDays = [];
    if (!groupDays) {
      targetDays = [];
    } else if (
      groupDays === "Every day" ||
      (Array.isArray(groupDays) && groupDays.includes("Every day"))
    ) {
      targetDays = [1, 2, 3, 4, 5, 6];
    } else if (Array.isArray(groupDays)) {
      targetDays = groupDays
        .map((day) => dayToNumber[day])
        .filter((d) => d !== undefined);
    }

    // 5. Bugungi kungacha bo'lgan darslar sonini hisoblash
    let lessonsPassed = 0;
    let loopDate = new Date(calculationStartDate);

    while (loopDate <= todayDate) {
      const currentDayOfWeek = loopDate.getDay();
      if (targetDays.includes(currentDayOfWeek)) {
        lessonsPassed++;
      }
      loopDate.setDate(loopDate.getDate() + 1);
    }

    // 6. Qolgan darslarni hisoblash va oylik hisob
    let totalLessons = 12;
    let remaining = totalLessons - lessonsPassed;

    // Qarzni aniqlash (qancha dars to'lanmagan)
    let overdueLessons = 0;
    let monthsOverdue = 0;

    if (remaining < 0) {
      overdueLessons = Math.abs(remaining);
      monthsOverdue = Math.ceil(overdueLessons / 12);
    }

    // Agar to'lov bo'lmagan bo'lsa (yangi o'quvchi)
    if (!lastPayment) {
      remaining = totalLessons - Math.min(lessonsPassed, totalLessons);
    }

    // 7. STATUS ANIQLASH (YANGI LOGIKA: Qarzni darslar bilan ko'rsatish)
    let statusType = "waiting";
    let statusText = "";
    let statusBadgeText = "";
    let showPulse = false;
    let showPulseLast = false;

    if (monthsOverdue >= 2) {
      statusType = "twoMonths";
      statusText = `${monthsOverdue} oylik to'lanmagan`;
      statusBadgeText = `${monthsOverdue} oylik to'lanmagan`;
    } else if (remaining < 0) {
      statusType = "overdue";
      statusText = `Qarzdor (${Math.abs(remaining)} dars)`;
      statusBadgeText = `Qarzdor (${Math.abs(remaining)} dars)`;
      showPulse = true;
    } else if (remaining === 0) {
      statusType = "last";
      statusText = "0 (Oxirgi dars)";
      statusBadgeText = "Oxirgi dars";
      showPulseLast = true;
    } else if (remaining === 1) {
      statusType = "danger";
      statusText = `1 (Oxirgi dars)`;
      statusBadgeText = "Oxirgi dars";
      showPulseLast = true;
    } else if (remaining <= 3) {
      statusType = "warning";
      statusText = `${remaining} (To'lov boshlandi)`;
      statusBadgeText = "To'lov boshlandi";
      showPulse = true;
    } else {
      statusType = "waiting";
      statusText = `${remaining}`;
      statusBadgeText = "Kutilmoqda";
    }

    return {
      remaining,
      lessonsPassed: Math.min(lessonsPassed, totalLessons),
      statusType,
      statusText,
      statusBadgeText,
      showPulse,
      showPulseLast,
      hasPaymentHistory: !!lastPayment,
      lastPaymentDate: lastPayment ? lastPayment.date : null,
      lastAmount: lastPaymentAmount,
      monthsOverdue,
      overdueLessons: Math.max(0, -remaining), // Qarz darslar soni
      totalLessons: 12,
    };
  };

  // --- STATISTIKA ---
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const calculatedStudents = students.map((s) => {
    const info = calculateLessons(s.createdAt, selectedGroup?.days, s.id);
    return { ...s, info };
  });

  // To'langan studentlar (oxirgi to'lovi bo'lgan)
  const paidStudents = calculatedStudents.filter(
    (s) => s.info.hasPaymentHistory,
  );

  // To'lanmagan studentlar (hech qanday to'lovi bo'lmagan)
  const unpaidStudents = calculatedStudents.filter(
    (s) => !s.info.hasPaymentHistory,
  );

  // Kutilmoqda studentlar (4+ dars qolgan)
  const waitingStudents = calculatedStudents.filter(
    (s) => s.info.statusType === "waiting",
  );

  // To'lov boshlandi studentlar (2-3 dars qolgan)
  const paymentStartedStudents = calculatedStudents.filter(
    (s) => s.info.statusType === "warning",
  );

  // Qarzdor talabalar
  const overdueStudents = calculatedStudents.filter(
    (s) => s.info.statusType === "overdue" || s.info.statusType === "twoMonths",
  );

  // Jami tushum - BARCHA to'lovlar (faqat tanlangan guruh uchun)
  const allPaymentsForGroup = payments.filter(
    (p) => p.groupId === selectedGroupId,
  );
  const totalRevenue = allPaymentsForGroup.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0,
  );

  // Format currency with large number formatting
  const formatCurrency = (num) => {
    if (!num && num !== 0) return "0 UZS";

    const number = Number(num);

    // Katta raqamlarni formatlash
    if (number >= 1000000) {
      return formatLargeNumber(number) + " UZS";
    }

    return new Intl.NumberFormat("uz-UZ", {
      style: "currency",
      currency: "UZS",
      minimumFractionDigits: 0,
    }).format(num);
  };

  // O'tgan oyning sanasini olish
  const getLastMonthDate = () => {
    const today = new Date();
    const lastMonth = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      today.getDate(),
    );
    return lastMonth.toISOString().split("T")[0];
  };

  // To'lov qilish
  const handlePayment = async () => {
    if (!amount || Number(amount) <= 0) return toast.error("Summani kiriting!");
    if (!paymentDate) return toast.error("Sanani tanlang!");

    setLoading(true);
    try {
      await addDoc(collection(db, "payments"), {
        studentId: selectedStudent.id,
        studentName: (
          selectedStudent.studentName ||
          `${selectedStudent.firstName} ${selectedStudent.lastName}`
        ).trim(),
        groupId: selectedGroupId,
        groupName: selectedGroup?.groupName || "Noma'lum",
        amount: Number(amount),
        date: paymentDate,
        createdAt: serverTimestamp(),
      });
      toast.success("To'lov muvaffaqiyatli qabul qilindi!");
      setShowModal(false);
      setAmount("");
      setPaymentDate("");
    } catch (e) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-900">
      <ToastContainer position="top-right" autoClose={2000} />

      {/* Header */}
      <div className="mb-10">
        <div className="lg:col-span-1 flex flex-col justify-center">
          <h1 className="text-3xl font-black tracking-tight text-slate-800">
            To'lovlar
          </h1>
          <p className="text-slate-500 flex items-center gap-2 mt-1 font-medium">
            <FiCalendar className="text-blue-500" /> {today}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mt-5">
          <StatCard
            icon={<FiUsers />}
            label="O'quvchilar"
            value={students.length}
            color="blue"
          />
          <StatCard
            icon={<FiUserCheck />}
            label="To'langan"
            value={paidStudents.length}
            color="green"
          />
          <StatCard
            icon={<FiUserX />}
            label="To'lanmagan"
            value={unpaidStudents.length}
            color="orange"
          />

          <StatCard
            icon={<FiAlertTriangle />}
            label="Qarzdorlar"
            value={overdueStudents.length}
            color="red"
          />
          <StatCard
            icon={<FiDollarSign />}
            label="Jami Tushum"
            value={formatLargeNumber(totalRevenue)}
            color="emerald"
            isMoney={true}
          />
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 mb-8 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="O'quvchi ismini qidiring..."
            className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          className="w-full md:w-72 bg-slate-50 border-none rounded-2xl py-4 px-5 outline-none font-bold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
        >
          <option value="">Guruhni tanlang...</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.groupName || g.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[32px] shadow-xl border border-slate-200 overflow-hidden">
        {!selectedGroupId ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr className="text-[10px] uppercase text-slate-400 font-black tracking-widest">
                  <th className="py-6 px-8">O'quvchi</th>
                  <th className="py-6 px-6 text-center">Darslar (Qolgan)</th>
                  <th className="py-6 px-6 text-center">Status</th>
                  <th className="py-6 px-8 text-center">Oxirgi to'lov</th>
                  <th className="py-6 px-8 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {calculatedStudents
                  .filter((s) =>
                    (s.studentName || `${s.firstName} ${s.lastName}`)
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()),
                  )
                  .map((student) => {
                    const info = student.info;

                    // Styles Logic
                    let rowBgClass = "";
                    let statusBadgeClass = "";
                    let actionBtnClass = "";
                    let progressColor = "";
                    let avatarColor = "";
                    let dotColor = "";
                    let pulseClass = "";
                    let badgeText = info.statusBadgeText;
                    let statusIconColor = "";

                    switch (info.statusType) {
                      case "twoMonths":
                        rowBgClass = "bg-red-50 border-red-200";
                        statusBadgeClass =
                          "bg-red-500 text-white border-red-500";
                        actionBtnClass =
                          "bg-red-100 text-red-600 border-red-200";
                        progressColor = "bg-red-500";
                        avatarColor = "bg-red-500";
                        dotColor = "bg-white";
                        pulseClass = "animate-pulse";
                        statusIconColor = "text-red-600";
                        break;
                      case "overdue":
                        rowBgClass = "bg-red-50 border-red-100";
                        statusBadgeClass =
                          "bg-red-500 text-white border-red-500";
                        actionBtnClass =
                          "bg-red-100 text-red-600 border-red-200";
                        progressColor = "bg-red-500";
                        avatarColor = "bg-red-500";
                        dotColor = "bg-white";
                        pulseClass = "animate-pulse";
                        statusIconColor = "text-red-600";
                        break;
                      case "last":
                        rowBgClass = "bg-red-50 border-red-100";
                        statusBadgeClass =
                          "bg-red-500 text-white border-red-500";
                        actionBtnClass =
                          "bg-red-100 text-red-600 border-red-200";
                        progressColor = "bg-red-500";
                        avatarColor = "bg-red-500";
                        dotColor = "bg-white";
                        pulseClass = info.showPulseLast ? "animate-pulse" : "";
                        statusIconColor = "text-red-600";
                        badgeText = "Oxirgi dars";
                        break;
                      case "danger":
                        rowBgClass = "bg-red-50 border-red-100";
                        statusBadgeClass =
                          "bg-red-500 text-white border-red-500";
                        actionBtnClass =
                          "bg-red-100 text-red-600 border-red-200";
                        progressColor = "bg-red-500";
                        avatarColor = "bg-red-500";
                        dotColor = "bg-white";
                        pulseClass = info.showPulseLast ? "animate-pulse" : "";
                        statusIconColor = "text-red-600";
                        badgeText = "Oxirgi dars";
                        break;
                      case "warning":
                        rowBgClass = "bg-orange-50/50";
                        statusBadgeClass =
                          "bg-orange-500 text-white border-orange-500";
                        actionBtnClass =
                          "bg-orange-100 text-orange-600 border-orange-200";
                        progressColor = "bg-orange-500";
                        avatarColor = "bg-orange-500";
                        dotColor = "bg-white";
                        pulseClass = info.showPulse ? "animate-pulse" : "";
                        statusIconColor = "text-orange-600";
                        badgeText = "To'lov boshlandi";
                        break;
                      case "waiting":
                        rowBgClass = "hover:bg-slate-50/50 bg-white";
                        statusBadgeClass =
                          "bg-blue-500 text-white border-blue-500";
                        actionBtnClass =
                          "bg-blue-50 text-blue-600 border-blue-100";
                        progressColor = "bg-blue-500";
                        avatarColor = "bg-blue-500";
                        dotColor = "bg-white";
                        statusIconColor = "text-blue-600";
                        badgeText = "Kutilmoqda";
                        break;
                      default:
                        rowBgClass = "hover:bg-slate-50/50 bg-white";
                        statusBadgeClass =
                          "bg-blue-500 text-white border-blue-500";
                        actionBtnClass =
                          "bg-blue-50 text-blue-600 border-blue-100";
                        progressColor = "bg-blue-500";
                        avatarColor = "bg-blue-500";
                        dotColor = "bg-white";
                        statusIconColor = "text-blue-600";
                        break;
                    }

                    // Agar to'lov bo'lsa, statusni "To'langan" qilamiz
                    if (info.hasPaymentHistory && info.lastAmount > 0) {
                      badgeText = `To'langan (${formatCurrency(info.lastAmount)})`;
                      statusBadgeClass =
                        "bg-emerald-500 text-white border-emerald-500";
                      dotColor = "bg-white";
                      statusIconColor = "text-emerald-600";
                    }

                    return (
                      <tr
                        key={student.id}
                        className={`transition-all duration-300 border-b ${rowBgClass}`}
                      >
                        <td className="py-5 px-8">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm uppercase ${avatarColor}`}
                            >
                              {(
                                student.studentName ||
                                student.firstName ||
                                "?"
                              ).charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">
                                {student.studentName ||
                                  `${student.firstName} ${student.lastName}`}
                              </p>
                              <p className="text-xs text-slate-400 font-medium">
                                {student.phoneNumber}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-5 px-6 text-center">
                          <div className="text-sm font-black text-slate-700 mb-1">
                            {info.statusType === "overdue" ||
                            info.statusType === "twoMonths" ? (
                              <span className="text-red-600">
                                12 / 0 (Qarz: {info.overdueLessons} dars)
                              </span>
                            ) : (
                              `12 / ${info.remaining}`
                            )}
                          </div>
                          <div className="w-24 h-1.5 bg-slate-200 rounded-full mx-auto overflow-hidden">
                            <div
                              className={`h-full ${progressColor}`}
                              style={{
                                width: `${(info.lessonsPassed / 12) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </td>

                        <td className="py-5 px-6 text-center">
                          <div
                            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border text-[11px] font-black uppercase tracking-wider ${statusBadgeClass} ${pulseClass}`}
                          >
                            <div className="relative flex items-center">
                              <span
                                className={`w-2 h-2 rounded-full ${dotColor}`}
                              ></span>
                              {(info.showPulse || info.showPulseLast) && (
                                <span className="absolute top-0 left-0 w-2 h-2 rounded-full bg-white animate-ping opacity-70"></span>
                              )}
                            </div>
                            <span>{badgeText}</span>
                          </div>
                        </td>

                        <td className="py-5 px-8 text-center">
                          <div className="text-sm font-medium text-slate-600">
                            {info.hasPaymentHistory ? (
                              <>
                                <div className="font-bold">
                                  {formatCurrency(info.lastAmount)}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {info.lastPaymentDate
                                    ? new Date(
                                        info.lastPaymentDate,
                                      ).toLocaleDateString("uz-UZ")
                                    : "Noma'lum"}
                                </div>
                              </>
                            ) : (
                              <span className="text-slate-400 italic">
                                To'lov yo'q
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-5 px-8 text-right">
                          <button
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowModal(true);
                              if (
                                info.statusType === "overdue" ||
                                info.statusType === "twoMonths"
                              ) {
                                setPaymentDate(getLastMonthDate());
                              }
                            }}
                            className={`p-3 rounded-2xl border transition-all shadow-sm hover:scale-110 active:scale-95 ${actionBtnClass}`}
                            title="To'lov qilish"
                          >
                            <FiDollarSign
                              size={18}
                              className={statusIconColor}
                            />
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

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800">
                To'lov Qabul Qilish
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <FiX size={24} />
              </button>
            </div>
            <div className="space-y-6">
              <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
                  O'quvchi
                </p>
                <p className="font-bold text-lg text-slate-700">
                  {selectedStudent?.studentName ||
                    `${selectedStudent?.firstName} ${selectedStudent?.lastName}`}
                </p>
                <p className="text-xs text-blue-500 mt-1 font-medium">
                  To'lov qilinganda hisob 12 talik yangi siklga o'tadi.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">
                  To'lov sanasi
                </label>
                <div className="relative">
                  <FiCalendar
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
                    size={20}
                  />
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-[24px] py-5 pl-14 pr-6 outline-none focus:border-blue-500 focus:bg-white text-base font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1">
                  Summa (UZS)
                </label>
                <div className="relative">
                  <FiCreditCard
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
                    size={20}
                  />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-[24px] py-5 pl-14 pr-6 outline-none focus:border-blue-500 focus:bg-white text-2xl font-black transition-all"
                    placeholder="0"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2 ml-1">
                  Kurs narxi:{" "}
                  {selectedGroup?.coursePrice
                    ? formatCurrency(selectedGroup.coursePrice)
                    : "Belgilanmagan"}
                </p>
              </div>
              <button
                disabled={loading}
                onClick={handlePayment}
                className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-lg shadow-xl hover:bg-blue-700 transition-all transform active:scale-95 disabled:opacity-50"
              >
                {loading ? "Saqlanmoqda..." : "Tasdiqlash"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Yordamchi komponentlar
const StatCard = ({ icon, label, value, color, isMoney }) => {
  const bgColors = {
    blue: "bg-blue-50",
    green: "bg-emerald-50",
    orange: "bg-orange-50",
    indigo: "bg-indigo-50",
    red: "bg-red-50",
    emerald: "bg-emerald-50",
  };

  const borderColors = {
    blue: "border-blue-100",
    green: "border-emerald-100",
    orange: "border-orange-100",
    indigo: "border-indigo-100",
    red: "border-red-100",
    emerald: "border-emerald-100",
  };

  const iconColors = {
    blue: "text-blue-600",
    green: "text-emerald-600",
    orange: "text-orange-600",
    indigo: "text-indigo-600",
    red: "text-red-600",
    emerald: "text-emerald-600",
  };

  return (
    <div
      className={`bg-white p-6 rounded-3xl border ${borderColors[color]} shadow-sm flex items-center gap-5 transition-transform hover:scale-[1.02]`}
    >
      <div
        className={`p-4 rounded-2xl ${bgColors[color]} ${iconColors[color]}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider truncate">
          {label}
        </p>
        <p
          className={`${isMoney ? "text-xl" : "text-2xl"} font-black text-slate-800 truncate`}
        >
          {value}
        </p>
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="py-32 text-center text-slate-400">
    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
      <FiUsers size={32} className="opacity-20" />
    </div>
    <p className="font-bold text-lg">Guruh tanlanmagan</p>
    <p className="text-sm font-medium opacity-60">
      Ro'yxatni ko'rish uchun yuqoridan guruhni tanlang
    </p>
  </div>
);

export default AddPayments;
