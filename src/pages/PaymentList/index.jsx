import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase/firebase";
import { collection, onSnapshot, collectionGroup } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Phone,
  Clock,
  ChevronRight,
  Search,
  DollarSign,
  ChevronLeft,
  Wallet,
  Info,
  TrendingUp,
  Calendar,
  AlertTriangle,
  ChevronsLeft,
  ChevronsRight,
  UserPlus,
} from "lucide-react";

const GlobalPaymentsDashboard = () => {
  const { t } = useTranslation();
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [groups, setGroups] = useState({});
  const [loading, setLoading] = useState(true);

  // UI State
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [historyPage, setHistoryPage] = useState({});
  const itemsPerPage = 10;
  const historyItemsPerPage = 10;

  useEffect(() => {
    setLoading(true);
    const unsubGroups = onSnapshot(collection(db, "groups"), (snap) => {
      const groupData = {};
      snap.docs.forEach((d) => {
        groupData[d.id] = { id: d.id, ...d.data() };
      });
      setGroups(groupData);
    });

    const unsubStudents = onSnapshot(
      collectionGroup(db, "students"),
      (snap) => {
        const studentData = snap.docs.map((d) => ({
          id: d.id,
          groupId: d.ref.parent.parent.id,
          ...d.data(),
        }));
        setStudents(studentData);
      },
    );

    const unsubPayments = onSnapshot(collection(db, "payments"), (snap) => {
      setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubGroups();
      unsubStudents();
      unsubPayments();
    };
  }, []);

  const normalizeAmount = (amount) => {
    const num = Number(amount) || 0;
    if (num < 1000) {
      return num * 1000;
    }
    return num;
  };

  const formatSum = (n) => {
    if (!n && n !== 0) return "0";
    return new Intl.NumberFormat("uz-UZ", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
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

  const countLessonsInRange = (targetDays, startDate, endDate) => {
    if (!targetDays.length) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      if (targetDays.includes(current.getDay())) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  // Student qoʻshilgan kunni tekshirish
  const isToday = (date) => {
    const today = new Date();
    const checkDate = new Date(date);
    return (
      checkDate.getDate() === today.getDate() &&
      checkDate.getMonth() === today.getMonth() &&
      checkDate.getFullYear() === today.getFullYear()
    );
  };

  const processedData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const list = students.map((student) => {
      const group = groups[student.groupId] || {};

      // Kurs narxini normallashtirish
      let coursePrice = Number(group.coursePrice) || 0;
      coursePrice = normalizeAmount(coursePrice);

      // Student qoʻshilgan sana
      const joinedDate = student.createdAt?.toDate?.() || new Date();
      const joinedMonth = joinedDate.getMonth();
      const joinedYear = joinedDate.getFullYear();
      const isJoinedToday = isToday(joinedDate);
      const isJoinedThisMonth =
        joinedMonth === currentMonth && joinedYear === currentYear;

      // Studentning barcha toʻlovlari (eng yangisi birinchi)
      const allStudentPayments = payments
        .filter((p) => p.studentId === student.id)
        .map((p) => ({
          ...p,
          amount: normalizeAmount(p.amount),
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      // Jami toʻlovlar
      const totalPaid = allStudentPayments.reduce(
        (sum, p) => sum + p.amount,
        0,
      );

      // Joriy oy toʻlovlari
      const paidThisMonth = allStudentPayments
        .filter((p) => {
          const d = new Date(p.date);
          return (
            d.getMonth() === currentMonth && d.getFullYear() === currentYear
          );
        })
        .reduce((sum, p) => sum + p.amount, 0);

      // Oylar kesimidagi toʻlov tahlili (oxirgi 6 oy)
      const monthlyPayments = [];
      let totalDebt = 0;
      let debtMonths = 0;
      let oldestDebtMonth = null;

      for (let i = 0; i < 6; i++) {
        const monthDate = new Date(currentYear, currentMonth - i, 1);
        const month = monthDate.getMonth();
        const year = monthDate.getFullYear();

        // Agar student shu oyda qoʻshilgan boʻlsa va oy kelajak boʻlsa, hisobga olma
        if (
          (year > joinedYear || (year === joinedYear && month > joinedMonth)) &&
          !isJoinedThisMonth
        ) {
          continue;
        }

        // Student shu oyda mavjudmi'
        const studentExistedThisMonth =
          year > joinedYear ||
          (year === joinedYear && month >= joinedMonth) ||
          isJoinedThisMonth;

        if (!studentExistedThisMonth) {
          continue;
        }

        const monthPayments = allStudentPayments.filter((p) => {
          const d = new Date(p.date);
          return d.getMonth() === month && d.getFullYear() === year;
        });

        const monthTotal = monthPayments.reduce((sum, p) => sum + p.amount, 0);
        const monthDebt = Math.max(0, coursePrice - monthTotal);

        monthlyPayments.push({
          month,
          year,
          paid: monthTotal,
          debt: monthDebt,
          isPaid: monthTotal >= coursePrice,
          isPartial: monthTotal > 0 && monthTotal < coursePrice,
          paymentCount: monthPayments.length,
        });

        if (monthDebt > 0 && monthTotal > 0) {
          totalDebt += monthDebt;
          debtMonths++;
          if (!oldestDebtMonth) oldestDebtMonth = `${month + 1}/${year}`;
        } else if (
          monthTotal === 0 &&
          !(month === currentMonth && isJoinedToday)
        ) {
          totalDebt += coursePrice;
          debtMonths++;
          if (!oldestDebtMonth) oldestDebtMonth = `${month + 1}/${year}`;
        }
      }

      // Darslar statistikasi
      const targetDays = getTargetDays(group.days);
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);
      const totalLessonsInMonth =
        countLessonsInRange(targetDays, monthStart, monthEnd) || 12;

      const latestPaymentThisMonth =
        allStudentPayments.find((p) => {
          const d = new Date(p.date);
          return (
            d.getMonth() === currentMonth && d.getFullYear() === currentYear
          );
        }) || null;

      const paymentLessonIndex = latestPaymentThisMonth
        ? countLessonsInRange(
            targetDays,
            monthStart,
            new Date(latestPaymentThisMonth.date),
          )
        : 0;

      const currentLessonIndex = countLessonsInRange(
        targetDays,
        monthStart,
        now,
      );

      const totalLessons = totalLessonsInMonth;
      const attendedLessons = student.attendedLessons || 0;
      const currentCycleLesson = attendedLessons % totalLessons;
      const lessonsLeft = Math.max(0, totalLessons - currentCycleLesson);
      const cycleNumber = Math.floor(attendedLessons / totalLessons) + 1; // STATUS ANIQLASH LOGIKASI
      let status = "unpaid";
      let statusText = t("Unpaid");
      let statusColor = "orange";
      let note = "";
      let diffLabel = t("Remaining");
      let diffValue = 0;
      let badgeText = "";

      if (isJoinedToday) {
        if (paidThisMonth >= coursePrice) {
          status = "paid";
          statusText = t("Paid");
          statusColor = "green";
          note = `✅ ${t("paymentsList.note.paidToday")}`;
          badgeText = t("paymentsList.badge.newPaid");
        } else {
          status = "pending";
          statusText = t("Pending");
          statusColor = "yellow";
          note = `⏳ ${t("paymentsList.note.awaitingPayment")}`;
          diffLabel = t("Payment");
          diffValue = coursePrice;
          badgeText = t("paymentsList.badge.newPending");
        }
      } else if (paidThisMonth >= coursePrice) {
        status = "paid";
        statusText = t("Paid");
        statusColor = "green";
        note = `✅ ${t("paymentsList.note.currentMonthPaid")}`;
        diffLabel = t("Paid");
        diffValue = paidThisMonth;
        badgeText = t("paymentsList.badge.payer");
      } else if (paidThisMonth > 0 && paidThisMonth < coursePrice) {
        status = "debtor";
        statusText = t("Debtor");
        statusColor = "red";
        const remainingDebt = coursePrice - paidThisMonth;
        note = `💰 ${formatSum(remainingDebt)} ${t("paymentsList.note.debt")}`;
        diffLabel = t("Debt");
        diffValue = remainingDebt;
        badgeText = t("paymentsList.badge.partial");
      } else {
        if (lessonsLeft === 0) {
          status = "debtor";
          statusText = t("Debtor");
          statusColor = "red";
          note = `⚠️ ${t("paymentsList.note.expiredNoPayment")}`;
          diffLabel = t("Debt");
          diffValue = coursePrice;
          badgeText = t("paymentsList.badge.expired");
        } else if (lessonsLeft === 1) {
          status = "debtor";
          statusText = t("Debtor");
          statusColor = "red";
          note = `🔥 ${t("paymentsList.note.lastLessonNoPayment")}`;
          diffLabel = t("Debt");
          diffValue = coursePrice;
          badgeText = t("paymentsList.badge.lastLesson");
        } else if (lessonsLeft <= 3) {
          status = "unpaid";
          statusText = t("Unpaid");
          statusColor = "orange";
          note = `⚠️ ${t("paymentsList.note.lessonsLeftUnpaid", { count: lessonsLeft })}`;
          diffLabel = t("Remaining");
          diffValue = coursePrice;
          badgeText = t("paymentsList.badge.unpaid");
        } else {
          status = "unpaid";
          statusText = t("Unpaid");
          statusColor = "orange";
          note = t("paymentsList.note.lessonsLeft", { count: lessonsLeft });
          diffLabel = t("Remaining");
          diffValue = coursePrice;
          badgeText = t("paymentsList.badge.unpaid");
        }
      }

      if (debtMonths > 0 && status !== "paid") {
        status = "debtor";
        statusText = t("Debtor");
        statusColor = "red";

        if (debtMonths === 1) {
          note = `💰 ${t("paymentsList.note.oneMonthDebt", { amount: formatSum(totalDebt) })}`;
        } else {
          note = `💰 ${t("paymentsList.note.multiMonthDebt", { count: debtMonths, amount: formatSum(totalDebt) })}`;
        }

        if (oldestDebtMonth) {
          note += ` (${t("paymentsList.note.fromMonth", { month: oldestDebtMonth })})`;
        }

        diffLabel = t("paymentsList.totalDebt");
        diffValue = totalDebt;
        badgeText = t("paymentsList.badge.monthsDebtor", { count: debtMonths });
      }

      // Toʻlov statistikasi
      const paymentStats = {
        total: totalPaid,
        thisMonth: paidThisMonth,
        average:
          allStudentPayments.length > 0
            ? Math.round(totalPaid / allStudentPayments.length)
            : 0,
        lastPayment: allStudentPayments[0] || null,
        firstPayment: allStudentPayments[allStudentPayments.length - 1] || null,
        paymentCount: allStudentPayments.length,
      };

      return {
        id: student.id,
        studentName: student.studentName || "",
        lastName: student.lastName || "",
        phoneNumber: student.phoneNumber || "",
        groupName: group.groupName || t("No group"),
        groupId: student.groupId,
        coursePrice,
        paymentStats,
        paidThisMonth,
        totalDebt,
        debtMonths,
        oldestDebtMonth,
        lessonsLeft,
        totalLessonsInMonth,
        paymentLessonIndex,
        currentLessonIndex,
        currentCycleLesson,
        cycleNumber,
        isJoinedToday,
        isJoinedThisMonth,
        status,
        statusText,
        statusColor,
        note,
        badgeText,
        diffLabel,
        diffValue,
        allPayments: allStudentPayments,
        monthlyPayments,
        paymentCount: allStudentPayments.length,
      };
    });

    // Filtrlash
    const filtered = list.filter((s) => {
      const fullName = `${s.studentName} ${s.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (activeTab === "paid") return s.status === "paid";
      if (activeTab === "unpaid") return s.status === "unpaid";
      if (activeTab === "debtor") return s.status === "debtor";
      if (activeTab === "pending") return s.status === "pending";
      return true;
    });

    // Statistika
    const stats = {
      total: list.length,
      paid: list.filter((s) => s.status === "paid").length,
      unpaid: list.filter((s) => s.status === "unpaid").length,
      debtors: list.filter((s) => s.status === "debtor").length,
      pending: list.filter((s) => s.status === "pending").length,
      totalRevenue: list.reduce((sum, s) => sum + s.paidThisMonth, 0),
      totalDebt: list.reduce((sum, s) => sum + s.totalDebt, 0),
      debtorsCount: list.filter((s) => s.debtMonths > 0).length,
    };

    return {
      filteredStudents: filtered,
      stats,
    };
  }, [students, payments, groups, searchTerm, activeTab, t]);
  // Pagination
  const totalPages = Math.ceil(
    processedData.filteredStudents.length / itemsPerPage,
  );
  const currentData = processedData.filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const getHistoryPageData = (studentId, payments) => {
    const page = historyPage[studentId] || 1;
    const totalHistoryPages = Math.ceil(payments.length / historyItemsPerPage);
    const historyData = payments.slice(
      (page - 1) * historyItemsPerPage,
      page * historyItemsPerPage,
    );
    return { historyData, totalHistoryPages, currentHistoryPage: page };
  };

  const handleHistoryPageChange = (studentId, newPage) => {
    setHistoryPage((prev) => ({
      ...prev,
      [studentId]: newPage,
    }));
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-indigo-600 rounded-full animate-pulse"></div>
          </div>
        </div>
        <p className="mt-6 text-indigo-900 dark:text-indigo-300 font-bold tracking-widest animate-pulse">
          {t("Loading")}
        </p>
      </div>
    );

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 min-h-screen font-sans">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
          {t("paymentsList.title")}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
          {t("paymentsList.subtitle")}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        <StatCard
          title={t("paymentsList.stats.totalStudents")}
          value={processedData.stats.total}
          icon={<Users size={24} />}
          color="blue"
          subtitle={t("paymentsList.stats.allStudents")}
        />
        <StatCard
          title={t("paymentsList.stats.paid")}
          value={processedData.stats.paid}
          icon={<CheckCircle2 size={24} />}
          color="green"
          subtitle={t("paymentsList.stats.paidThisMonth")}
        />
        <StatCard
          title={t("paymentsList.stats.pending")}
          value={processedData.stats.pending}
          icon={<UserPlus size={24} />}
          color="yellow"
          subtitle={t("paymentsList.stats.joinedToday")}
        />
        <StatCard
          title={t("paymentsList.stats.unpaid")}
          value={processedData.stats.unpaid}
          icon={<Clock size={24} />}
          color="orange"
          subtitle={t("paymentsList.stats.daysLeft", { count: 3 })}
        />
        <StatCard
          title={t("paymentsList.stats.debtors")}
          value={processedData.stats.debtors}
          icon={<AlertTriangle size={24} />}
          color="red"
          subtitle={t("paymentsList.stats.hasDebt")}
        />
      </div>

      {/* Revenue Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/15 rounded-xl">
              <TrendingUp className="text-indigo-600" size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {t("paymentsList.monthlyRevenue")}
              </p>
              <p className="text-2xl font-black text-indigo-600">
                {formatSum(processedData.stats.totalRevenue)} UZS
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {t("paymentsList.totalPayments")}: {payments.length}{" "}
              {t("paymentsList.items")}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors"
              size={20}
            />
            <input
              type="text"
              placeholder={t("paymentsList.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto">
            <TabBtn
              active={activeTab === "all"}
              onClick={() => {
                setActiveTab("all");
                setCurrentPage(1);
              }}
              label={t("All")}
              count={processedData.stats.total}
              color="indigo"
            />
            <TabBtn
              active={activeTab === "paid"}
              onClick={() => {
                setActiveTab("paid");
                setCurrentPage(1);
              }}
              label={t("Paid")}
              count={processedData.stats.paid}
              color="green"
            />
            <TabBtn
              active={activeTab === "pending"}
              onClick={() => {
                setActiveTab("pending");
                setCurrentPage(1);
              }}
              label={t("Pending")}
              count={processedData.stats.pending}
              color="yellow"
            />
            <TabBtn
              active={activeTab === "unpaid"}
              onClick={() => {
                setActiveTab("unpaid");
                setCurrentPage(1);
              }}
              label={t("Unpaid")}
              count={processedData.stats.unpaid}
              color="orange"
            />
            <TabBtn
              active={activeTab === "debtor"}
              onClick={() => {
                setActiveTab("debtor");
                setCurrentPage(1);
              }}
              label={t("Debtor")}
              count={processedData.stats.debtors}
              color="red"
            />
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* List Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Users size={18} className="text-indigo-500" />
            {t("paymentsList.studentsList")} (
            {processedData.filteredStudents.length})
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-slate-500 dark:text-slate-400">
                  {t("Paid")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-slate-500 dark:text-slate-400">
                  {t("Pending")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-slate-500 dark:text-slate-400">
                  {t("Unpaid")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-slate-500 dark:text-slate-400">
                  {t("Debtor")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="p-5 pl-8 text-xs font-black text-slate-400 dark:text-slate-500 uppercase">
                  {t("Student")}
                </th>
                <th className="p-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase text-center">
                  {t("Status")}
                </th>
                <th className="p-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase text-center">
                  {t("paymentsList.paidAmount")}
                </th>
                <th className="p-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase text-center">
                  {activeTab === "debtor" ? t("Debt") : t("Remaining")}
                </th>
                <th className="p-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase text-center">
                  {t("Lessons")}
                </th>
                <th className="p-5 pr-8 text-xs font-black text-slate-400 dark:text-slate-500 uppercase text-right">
                  {t("History")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentData.length > 0 ? (
                currentData.map((student) => {
                  const isExpanded = expandedStudent === student.id;
                  const { historyData, totalHistoryPages, currentHistoryPage } =
                    getHistoryPageData(student.id, student.allPayments);

                  // Status rangini aniqlash
                  const statusBgColor = {
                    paid: "bg-green-100 text-green-700 border-green-200",
                    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
                    unpaid: "bg-orange-100 text-orange-700 border-orange-200",
                    debtor: "bg-red-100 text-red-700 border-red-200",
                  }[student.status];

                  const avatarBgColor = {
                    paid: "bg-green-100 text-green-600",
                    pending: "bg-yellow-100 text-yellow-600",
                    unpaid: "bg-orange-100 text-orange-600",
                    debtor: "bg-red-100 text-red-600",
                  }[student.status];

                  const diffTextColor = {
                    paid: "text-green-600",
                    pending: "text-yellow-600",
                    unpaid: "text-orange-600",
                    debtor: "text-red-600",
                  }[student.status];

                  const clockColor = {
                    paid: "text-green-500",
                    pending: "text-yellow-500",
                    unpaid:
                      student.lessonsLeft <= 3
                        ? "text-orange-500"
                        : "text-slate-400",
                    debtor: "text-red-500",
                  }[student.status];

                  return (
                    <React.Fragment key={student.id}>
                      {/* Main Row */}
                      <tr
                        onClick={() =>
                          setExpandedStudent(isExpanded ? null : student.id)
                        }
                        className={`cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/60 ${
                          isExpanded
                            ? "bg-indigo-50/30 dark:bg-indigo-500/10"
                            : ""
                        }`}
                      >
                        <td className="p-5 pl-8">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${avatarBgColor}`}
                            >
                              {student.studentName?.[0]}
                              {student.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-800 dark:text-slate-100">
                                {student.studentName} {student.lastName}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-md">
                                  {student.groupName}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                  <Phone size={10} /> {student.phoneNumber}
                                </span>
                                {student.isJoinedToday && (
                                  <span className="text-[10px] font-bold bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-md">
                                    🆕 {t("paymentsList.new")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          <span
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border ${statusBgColor}`}
                          >
                            {student.statusText}
                          </span>
                        </td>
                        <td className="p-5 text-center">
                          <p className="font-bold text-slate-700 dark:text-slate-200">
                            {formatSum(student.paidThisMonth)} UZS
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            {t("Fee")}: {formatSum(student.coursePrice)}
                          </p>
                        </td>
                        <td className="p-5 text-center">
                          <p className={`font-black ${diffTextColor}`}>
                            {student.diffValue > 0
                              ? `${student.status === "paid" ? "+" : "-"}${formatSum(student.diffValue)}`
                              : "0"}{" "}
                            UZS
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                            {student.diffLabel}
                          </p>
                        </td>
                        <td className="p-5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Clock size={14} className={clockColor} />
                            <p
                              className={`text-sm font-bold ${
                                student.lessonsLeft <= 3 &&
                                student.status !== "paid"
                                  ? student.status === "debtor"
                                    ? "text-red-500"
                                    : "text-orange-500"
                                  : "text-slate-700 dark:text-slate-200"
                              }`}
                            >
                              {student.totalLessonsInMonth}/
                              {student.paidThisMonth > 0
                                ? student.paymentLessonIndex ||
                                  student.currentLessonIndex
                                : student.currentLessonIndex}
                            </p>
                          </div>
                          {student.note && (
                            <p
                              className={`text-[10px] mt-1 ${
                                student.status === "debtor"
                                  ? "text-red-400"
                                  : student.status === "pending"
                                    ? "text-yellow-500"
                                    : "text-slate-400 dark:text-slate-500"
                              }`}
                            >
                              {student.note}
                            </p>
                          )}
                        </td>
                        <td className="p-5 pr-8 text-right">
                          <ChevronRight
                            size={18}
                            className={`text-slate-400 dark:text-slate-500 transition-transform duration-300 ${
                              isExpanded ? "rotate-90 text-indigo-500" : ""
                            }`}
                          />
                        </td>
                      </tr>

                      {/* Payment History (Expanded) */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50 dark:bg-slate-800/40">
                          <td colSpan="6" className="p-6">
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                  <Wallet
                                    size={16}
                                    className="text-indigo-500"
                                  />
                                  {t("paymentsList.paymentHistory")} (
                                  {student.paymentCount}{" "}
                                  {t("paymentsList.items")})
                                </h4>
                                <div className="text-xs text-slate-400 dark:text-slate-500">
                                  {t("paymentsList.coursePrice")}:{" "}
                                  {formatSum(student.coursePrice)} UZS
                                </div>
                              </div>

                              {historyData.length > 0 ? (
                                <>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                    {historyData.map((payment, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:shadow-sm transition-shadow"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                                            <DollarSign size={14} />
                                          </div>
                                          <div>
                                            <p className="font-bold text-slate-800 dark:text-slate-100">
                                              +{formatSum(payment.amount)} UZS
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                              <Calendar
                                                size={10}
                                                className="text-slate-400 dark:text-slate-500"
                                              />
                                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                {formatDate(payment.date)}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        <span className="text-[9px] font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-md uppercase">
                                          {payment.note || t("Payment")}
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* History Pagination */}
                                  {totalHistoryPages > 1 && (
                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                      <p className="text-xs text-slate-400 dark:text-slate-500">
                                        {(currentHistoryPage - 1) *
                                          historyItemsPerPage +
                                          1}{" "}
                                        -{" "}
                                        {Math.min(
                                          currentHistoryPage *
                                            historyItemsPerPage,
                                          student.paymentCount,
                                        )}{" "}
                                        / {student.paymentCount}
                                      </p>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() =>
                                            handleHistoryPageChange(
                                              student.id,
                                              1,
                                            )
                                          }
                                          disabled={currentHistoryPage === 1}
                                          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                                        >
                                          <ChevronsLeft size={14} />
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleHistoryPageChange(
                                              student.id,
                                              currentHistoryPage - 1,
                                            )
                                          }
                                          disabled={currentHistoryPage === 1}
                                          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                                        >
                                          <ChevronLeft size={14} />
                                        </button>
                                        <span className="text-xs font-bold px-3 py-1 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 rounded-lg">
                                          {currentHistoryPage} /{" "}
                                          {totalHistoryPages}
                                        </span>
                                        <button
                                          onClick={() =>
                                            handleHistoryPageChange(
                                              student.id,
                                              currentHistoryPage + 1,
                                            )
                                          }
                                          disabled={
                                            currentHistoryPage ===
                                            totalHistoryPages
                                          }
                                          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                                        >
                                          <ChevronRight size={14} />
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleHistoryPageChange(
                                              student.id,
                                              totalHistoryPages,
                                            )
                                          }
                                          disabled={
                                            currentHistoryPage ===
                                            totalHistoryPages
                                          }
                                          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                                        >
                                          <ChevronsRight size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-center py-8">
                                  <Info
                                    className="mx-auto text-slate-300 dark:text-slate-600 mb-2"
                                    size={24}
                                  />
                                  <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                                    {t("paymentsList.noPaymentHistory")}
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="p-12 text-center">
                    <Users
                      className="mx-auto text-slate-300 dark:text-slate-600 mb-3"
                      size={48}
                    />
                    <p className="text-lg font-bold text-slate-400 dark:text-slate-500">
                      {t("paymentsList.noStudents")}
                    </p>
                    <p className="text-sm text-slate-300 dark:text-slate-600 mt-1">
                      {t("paymentsList.changeSearch")}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Main Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {(currentPage - 1) * itemsPerPage + 1} -{" "}
              {Math.min(
                currentPage * itemsPerPage,
                processedData.filteredStudents.length,
              )}{" "}
              / {processedData.filteredStudents.length}{" "}
              {t("paymentsList.items")}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                    currentPage === i + 1
                      ? "bg-indigo-600 text-white"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// StatCard Component
const StatCard = ({ title, value, icon, color, subtitle }) => {
  const bgClasses = {
    blue: "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300",
    green:
      "bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-300",
    yellow:
      "bg-yellow-50 dark:bg-yellow-500/15 text-yellow-600 dark:text-yellow-300",
    orange:
      "bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-300",
    red: "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-300",
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-3 rounded-xl ${bgClasses[color]}`}>{icon}</div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {title}
          </p>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {value}
          </p>
        </div>
      </div>
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Info size={12} /> {subtitle}
        </p>
      </div>
    </div>
  );
};

// Tab Button Component
const TabBtn = ({ active, onClick, label, count, color }) => {
  const activeStyles = {
    green: "bg-green-600 text-white",
    yellow: "bg-yellow-600 text-white",
    orange: "bg-orange-600 text-white",
    red: "bg-red-600 text-white",
    indigo: "bg-indigo-600 text-white",
  };

  const inactiveStyles = {
    green:
      "text-green-600 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-500/15",
    yellow:
      "text-yellow-600 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-500/15",
    orange:
      "text-orange-600 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-500/15",
    red: "text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/15",
    indigo:
      "text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/15",
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
        active ? activeStyles[color] : `${inactiveStyles[color]} bg-transparent`
      }`}
    >
      {label}
      <span
        className={`text-[10px] px-2 py-0.5 rounded-md ${
          active ? "bg-white/20" : "bg-slate-200 dark:bg-slate-700"
        }`}
      >
        {count}
      </span>
    </button>
  );
};

export default GlobalPaymentsDashboard;
