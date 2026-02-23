import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase/firebase";
import { collection, onSnapshot, collectionGroup } from "firebase/firestore";
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

  // Student qo'shilgan kunni tekshirish
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
    const list = students.map((student) => {
      const group = groups[student.groupId] || {};

      // Kurs narxini to'g'rilash
      let coursePrice = Number(group.coursePrice) || 0;
      coursePrice = normalizeAmount(coursePrice);

      // Studentning barcha to'lovlari
      const allStudentPayments = payments
        .filter((p) => p.studentId === student.id)
        .map((p) => ({
          ...p,
          amount: normalizeAmount(p.amount),
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      const totalPaid = allStudentPayments.reduce(
        (sum, p) => sum + p.amount,
        0,
      );

      // Joriy oy to'lovi
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const paidThisMonth = allStudentPayments
        .filter((p) => {
          const d = new Date(p.date);
          return (
            d.getMonth() === currentMonth && d.getFullYear() === currentYear
          );
        })
        .reduce((sum, p) => sum + p.amount, 0);

      // Student qo'shilgan sana
      const joinedDate = student.createdAt?.toDate?.() || new Date();
      const isJoinedToday = isToday(joinedDate);

      // Darslar soni (12 ta dars)
      const totalLessons = 12;
      const attendedLessons = student.attendedLessons || 0;
      const lessonsInCycle = attendedLessons % totalLessons;
      const lessonsLeft = Math.max(0, totalLessons - lessonsInCycle);

      // Status va izohlarni aniqlash
      let status = "unpaid";
      let statusText = "To'lanmagan";
      let statusColor = "orange";
      let note = "";
      let diffLabel = "Qoldiq";
      let diffValue = 0;

      // Agar bugun qo'shilgan bo'lsa
      if (isJoinedToday) {
        if (paidThisMonth > 0) {
          status = "paid";
          statusText = "To'langan";
          statusColor = "green";
          note = "✅ Bugun to'landi";
          diffLabel = "To'landi";
          diffValue = paidThisMonth;
        } else {
          status = "pending";
          statusText = "Kutilmoqda";
          statusColor = "yellow";
          note = "⏳ To'lov kutilmoqda";
          diffLabel = "Kutilmoqda";
          diffValue = coursePrice;
        }
      }
      // Agar to'lov qilgan bo'lsa
      else if (paidThisMonth >= coursePrice) {
        status = "paid";
        statusText = "To'langan";
        statusColor = "green";
        note = "✅ To'liq to'langan";
        diffLabel = "To'langan";
        diffValue = paidThisMonth;
      }
      // Agar qisman to'lagan bo'lsa
      else if (paidThisMonth > 0) {
        status = "debtor";
        statusText = "Qarzdor";
        statusColor = "red";
        note = `${formatSum(coursePrice - paidThisMonth)} qariz`;
        diffLabel = "Qarzi";
        diffValue = coursePrice - paidThisMonth;
      }
      // To'lov qilmagan bo'lsa, darslar qoldiqiga qarab
      else {
        if (lessonsLeft === 0) {
          status = "debtor";
          statusText = "Qarzdor";
          statusColor = "red";
          note = "❌ Bugun muddat tugaydi!";
          diffLabel = "Qarzi";
          diffValue = coursePrice;
        } else if (lessonsLeft === 1) {
          status = "debtor";
          statusText = "Qarzdor";
          statusColor = "red";
          note = "⚠️ Oxirgi dars!";
          diffLabel = "Qarzi";
          diffValue = coursePrice;
        } else if (lessonsLeft <= 3) {
          status = "unpaid";
          statusText = "To'lanmagan";
          statusColor = "orange";
          note = `${lessonsLeft} ta dars qoldi`;
          diffLabel = "Qoldiq";
          diffValue = coursePrice;
        } else {
          status = "unpaid";
          statusText = "To'lanmagan";
          statusColor = "orange";
          note = `${lessonsLeft} ta dars qoldi`;
          diffLabel = "Qoldiq";
          diffValue = coursePrice;
        }
      }

      // Qarizlarni hisoblash (oldingi oylar)
      let previousMonthsDebt = 0;
      let debtMonths = 0;

      for (let i = 1; i <= 3; i++) {
        const monthDate = new Date(currentYear, currentMonth - i, 1);
        const month = monthDate.getMonth();
        const year = monthDate.getFullYear();

        const monthlyPayments = allStudentPayments.filter((p) => {
          const paymentDate = new Date(p.date);
          return (
            paymentDate.getMonth() === month &&
            paymentDate.getFullYear() === year
          );
        });

        const monthlyTotal = monthlyPayments.reduce(
          (sum, p) => sum + p.amount,
          0,
        );

        if (monthlyTotal < coursePrice && monthlyTotal > 0) {
          previousMonthsDebt += coursePrice - monthlyTotal;
          debtMonths++;
        } else if (monthlyTotal === 0 && !isJoinedToday) {
          previousMonthsDebt += coursePrice;
          debtMonths++;
        }
      }

      const totalDebt = coursePrice - paidThisMonth + previousMonthsDebt;

      // Agar qarizlar bo'lsa, statusni o'zgartirish
      if (previousMonthsDebt > 0 && status !== "paid") {
        status = "debtor";
        statusText = "Qarzdor";
        statusColor = "red";
        note = `${debtMonths} oylik qarzdorlik!`;
        diffLabel = "Qarzi";
        diffValue = totalDebt;
      }

      return {
        id: student.id,
        studentName: student.studentName || "",
        lastName: student.lastName || "",
        phoneNumber: student.phoneNumber || "",
        groupName: group.groupName || "Guruhsiz",
        coursePrice,
        totalPaid,
        paidThisMonth,
        previousMonthsDebt,
        totalDebt,
        lessonsLeft,
        isJoinedToday,
        status,
        statusText,
        statusColor,
        note,
        diffLabel,
        diffValue,
        allPayments: allStudentPayments,
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
    };

    return {
      filteredStudents: filtered,
      stats,
    };
  }, [students, payments, groups, searchTerm, activeTab]);

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
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-indigo-600 rounded-full animate-pulse"></div>
          </div>
        </div>
        <p className="mt-6 text-indigo-900 font-bold tracking-widest animate-pulse">
          MA'LUMOTLAR YUKLANMOQDA...
        </p>
      </div>
    );

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-white min-h-screen font-sans">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
          To'lovlar Monitoringi
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          Barcha guruhlar va o'quvchilarning to'lov holati
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        <StatCard
          title="JAMI O'QUVCHILAR"
          value={processedData.stats.total}
          icon={<Users size={24} />}
          color="blue"
          subtitle="Barcha studentlar"
        />
        <StatCard
          title="TO'LAGANLAR"
          value={processedData.stats.paid}
          icon={<CheckCircle2 size={24} />}
          color="green"
          subtitle="Shu oy to'lagan"
        />
        <StatCard
          title="KUTILMOQDA"
          value={processedData.stats.pending}
          icon={<UserPlus size={24} />}
          color="yellow"
          subtitle="Bugun qo'shilgan"
        />
        <StatCard
          title="TO'LANMAGAN"
          value={processedData.stats.unpaid}
          icon={<Clock size={24} />}
          color="orange"
          subtitle={`${3} kun qolgan`}
        />
        <StatCard
          title="QARZDORLAR"
          value={processedData.stats.debtors}
          icon={<AlertTriangle size={24} />}
          color="red"
          subtitle="Qarizi bor"
        />
      </div>

      {/* Revenue Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 rounded-xl">
              <TrendingUp className="text-indigo-600" size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                OYLIK TUSHUM
              </p>
              <p className="text-2xl font-black text-indigo-600">
                {formatSum(processedData.stats.totalRevenue)} UZS
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">
              Jami to'lovlar: {payments.length} ta
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
              size={20}
            />
            <input
              type="text"
              placeholder="Ism yoki familiya bo'yicha qidirish..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl overflow-x-auto">
            <TabBtn
              active={activeTab === "all"}
              onClick={() => {
                setActiveTab("all");
                setCurrentPage(1);
              }}
              label="Barchasi"
              count={processedData.stats.total}
              color="indigo"
            />
            <TabBtn
              active={activeTab === "paid"}
              onClick={() => {
                setActiveTab("paid");
                setCurrentPage(1);
              }}
              label="To'langan"
              count={processedData.stats.paid}
              color="green"
            />
            <TabBtn
              active={activeTab === "pending"}
              onClick={() => {
                setActiveTab("pending");
                setCurrentPage(1);
              }}
              label="Kutilmoqda"
              count={processedData.stats.pending}
              color="yellow"
            />
            <TabBtn
              active={activeTab === "unpaid"}
              onClick={() => {
                setActiveTab("unpaid");
                setCurrentPage(1);
              }}
              label="To'lanmagan"
              count={processedData.stats.unpaid}
              color="orange"
            />
            <TabBtn
              active={activeTab === "debtor"}
              onClick={() => {
                setActiveTab("debtor");
                setCurrentPage(1);
              }}
              label="Qarzdor"
              count={processedData.stats.debtors}
              color="red"
            />
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* List Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-700 flex items-center gap-2">
            <Users size={18} className="text-indigo-500" />
            O'QUVCHILAR RO'YXATI ({processedData.filteredStudents.length})
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-slate-500">To'langan</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-slate-500">Kutilmoqda</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-slate-500">To'lanmagan</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-slate-500">Qarzdor</span>
              </div>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="p-5 pl-8 text-xs font-black text-slate-400 uppercase">
                  O'quvchi
                </th>
                <th className="p-5 text-xs font-black text-slate-400 uppercase text-center">
                  Status
                </th>
                <th className="p-5 text-xs font-black text-slate-400 uppercase text-center">
                  To'lagan
                </th>
                <th className="p-5 text-xs font-black text-slate-400 uppercase text-center">
                  {activeTab === "debtor" ? "Qarzi" : "Qoldiq"}
                </th>
                <th className="p-5 text-xs font-black text-slate-400 uppercase text-center">
                  Darslar
                </th>
                <th className="p-5 pr-8 text-xs font-black text-slate-400 uppercase text-right">
                  Tarix
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
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
                        className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${
                          isExpanded ? "bg-indigo-50/30" : ""
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
                              <p className="font-bold text-sm text-slate-800">
                                {student.studentName} {student.lastName}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md">
                                  {student.groupName}
                                </span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Phone size={10} /> {student.phoneNumber}
                                </span>
                                {student.isJoinedToday && (
                                  <span className="text-[10px] font-bold bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-md">
                                    🆕 Yangi
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
                          <p className="font-bold text-slate-700">
                            {formatSum(student.paidThisMonth)} UZS
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Kurs: {formatSum(student.coursePrice)}
                          </p>
                        </td>
                        <td className="p-5 text-center">
                          <p className={`font-black ${diffTextColor}`}>
                            {student.diffValue > 0
                              ? `${student.status === "paid" ? "+" : "-"}${formatSum(student.diffValue)}`
                              : "0"}{" "}
                            UZS
                          </p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">
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
                                  : "text-slate-700"
                              }`}
                            >
                              {student.lessonsLeft}/12
                            </p>
                          </div>
                          {student.note && (
                            <p
                              className={`text-[10px] mt-1 ${
                                student.status === "debtor"
                                  ? "text-red-400"
                                  : student.status === "pending"
                                    ? "text-yellow-500"
                                    : "text-slate-400"
                              }`}
                            >
                              {student.note}
                            </p>
                          )}
                        </td>
                        <td className="p-5 pr-8 text-right">
                          <ChevronRight
                            size={18}
                            className={`text-slate-400 transition-transform duration-300 ${
                              isExpanded ? "rotate-90 text-indigo-500" : ""
                            }`}
                          />
                        </td>
                      </tr>

                      {/* Payment History (Expanded) */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan="6" className="p-6">
                            <div className="bg-white rounded-xl border border-slate-200 p-5">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                  <Wallet
                                    size={16}
                                    className="text-indigo-500"
                                  />
                                  To'lovlar Tarixi ({student.paymentCount} ta)
                                </h4>
                                <div className="text-xs text-slate-400">
                                  Kurs narxi: {formatSum(student.coursePrice)}{" "}
                                  UZS
                                </div>
                              </div>

                              {historyData.length > 0 ? (
                                <>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                    {historyData.map((payment, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:shadow-sm transition-shadow"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                                            <DollarSign size={14} />
                                          </div>
                                          <div>
                                            <p className="font-bold text-slate-800">
                                              +{formatSum(payment.amount)} UZS
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                              <Calendar
                                                size={10}
                                                className="text-slate-400"
                                              />
                                              <p className="text-[10px] text-slate-500">
                                                {formatDate(payment.date)}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md uppercase">
                                          {payment.note || "To'lov"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* History Pagination */}
                                  {totalHistoryPages > 1 && (
                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                                      <p className="text-xs text-slate-400">
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
                                          className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30"
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
                                          className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30"
                                        >
                                          <ChevronLeft size={14} />
                                        </button>
                                        <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg">
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
                                          className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30"
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
                                          className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30"
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
                                    className="mx-auto text-slate-300 mb-2"
                                    size={24}
                                  />
                                  <p className="text-sm font-medium text-slate-400">
                                    To'lovlar mavjud emas
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
                    <Users className="mx-auto text-slate-300 mb-3" size={48} />
                    <p className="text-lg font-bold text-slate-400">
                      Studentlar topilmadi
                    </p>
                    <p className="text-sm text-slate-300 mt-1">
                      Qidiruv so'rovini o'zgartiring
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Main Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {(currentPage - 1) * itemsPerPage + 1} -{" "}
              {Math.min(
                currentPage * itemsPerPage,
                processedData.filteredStudents.length,
              )}{" "}
              / {processedData.filteredStudents.length} ta
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
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
                      : "hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
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
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-3 rounded-xl ${bgClasses[color]}`}>{icon}</div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {title}
          </p>
          <p className="text-2xl font-black text-slate-800 mt-1">{value}</p>
        </div>
      </div>
      <div className="pt-3 border-t border-slate-100">
        <p className="text-xs text-slate-500 flex items-center gap-1">
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
    green: "text-green-600 hover:bg-green-50",
    yellow: "text-yellow-600 hover:bg-yellow-50",
    orange: "text-orange-600 hover:bg-orange-50",
    red: "text-red-600 hover:bg-red-50",
    indigo: "text-indigo-600 hover:bg-indigo-50",
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
          active ? "bg-white/20" : "bg-slate-200"
        }`}
      >
        {count}
      </span>
    </button>
  );
};

export default GlobalPaymentsDashboard;
