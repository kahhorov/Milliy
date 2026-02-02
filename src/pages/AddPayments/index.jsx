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
  FiChevronDown,
  FiX,
  FiAlertCircle,
  FiCreditCard,
  FiCalendar,
  FiUser,
  FiDollarSign,
} from "react-icons/fi";

const AddPayments = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Barchasi");
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [amount, setAmount] = useState("");

  const today = new Date().toISOString().split("T")[0];

  // Guruhlarni olish
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

  // Studentlarni olish
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

  // Hafta kunlarini raqamga o'girish
  const dayToNumber = {
    Dushanba: 1,
    Seshanba: 2,
    Chorshanba: 3,
    Payshanba: 4,
    Juma: 5,
    Shanba: 6,
    Yakshanba: 0,
  };

  // Darslar sonini hisoblash
  const calculatePastLessons = (joinedAt, groupDays) => {
    if (!joinedAt || !groupDays) return 0;

    const startDate = new Date(joinedAt.seconds * 1000);
    const todayDate = new Date();
    let count = 0;

    const targetDays = groupDays.map((day) => dayToNumber[day]);

    for (
      let d = new Date(startDate);
      d <= todayDate;
      d.setDate(d.getDate() + 1)
    ) {
      if (targetDays.includes(d.getDay())) {
        count++;
      }
    }

    return count;
  };

  // Qolgan darslar sonini hisoblash (12 dars)
  const calculateRemainingLessons = (pastLessons) => {
    return 12 - (pastLessons % 12);
  };

  // Dars sikli holati
  const getLessonStatus = (student, group) => {
    if (!student || !group || !student.joinedAt) return {};

    const pastLessons = calculatePastLessons(
      student.joinedAt,
      group.days || [],
    );
    const remaining = calculateRemainingLessons(pastLessons);

    // Agar 0-dars bo'lsa (yangi sikl boshida)
    const isNewCycle = pastLessons % 12 === 0 && pastLessons > 0;

    return {
      pastLessons,
      remainingLessons: remaining,
      isNewCycle,
      isLastLesson: remaining === 1,
      isFirstLesson: pastLessons === 0,
    };
  };

  // Izoh matnini yaratish
  const getCommentText = (student, group) => {
    const status = getLessonStatus(student, group);

    if (status.isFirstLesson) {
      return "To'lov kuni: har oyning 7-sanasi";
    }

    if (status.isLastLesson) {
      return "4-darsdan keyin to'lov";
    }

    if (status.isNewCycle) {
      return "Yangi dastur boshlandi";
    }

    if (status.remainingLessons <= 3) {
      return `${status.remainingLessons} ta dars qoldi`;
    }

    return "To'lov kuni: har oyning 7-sanasi";
  };

  // To'lov qo'shish
  const handlePayment = async () => {
    if (!amount || Number(amount) <= 0) {
      return toast.error("Summani kiriting!");
    }

    try {
      await addDoc(collection(db, "payments"), {
        studentId: selectedStudent.id,
        studentName:
          `${selectedStudent.firstName || ""} ${selectedStudent.lastName || ""}`.trim(),
        groupId: selectedGroupId,
        groupName:
          groups.find((g) => g.id === selectedGroupId)?.groupName ||
          groups.find((g) => g.id === selectedGroupId)?.name,
        amount: Number(amount),
        date: today,
        createdAt: serverTimestamp(),
      });

      toast.success("To'lov saqlandi!");
      setShowModal(false);
      setAmount("");
      setSelectedStudent(null);
    } catch (e) {
      toast.error("Xatolik!");
    }
  };

  // Statistik ma'lumotlar
  const currentPayments = selectedGroupId
    ? payments.filter((p) => p.groupId === selectedGroupId)
    : [];
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const totalStudents = students.length;
  const paidStudents = new Set(currentPayments.map((p) => p.studentId)).size;
  const unpaidStudents = totalStudents - paidStudents;
  const totalIncome = currentPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <ToastContainer />

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">To'lovlar</h1>
        <p className="text-gray-600">To'lovlarni nazorat qilish va kuzatish</p>
      </div>

      {/* STATISTICS - RASMDAGI KO'RINISHDA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Jami</p>
          <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">To'langan</p>
          <p className="text-2xl font-bold text-green-600">{paidStudents}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">To'lanmagan</p>
          <p className="text-2xl font-bold text-red-600">{unpaidStudents}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Jami tushum</p>
          <p className="text-2xl font-bold text-blue-600">
            {totalIncome.toLocaleString()} so'm
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="O'quvchi yoki guruh bo'yicha qidirish..."
              className="w-full bg-gray-50 border border-gray-300 rounded-lg py-3 pl-12 pr-4 outline-none focus:border-blue-500 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Group Select - RASMDAGI KABI */}
          <div className="relative w-full lg:w-64">
            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setActiveTab("Barchasi");
              }}
              className="w-full bg-white border border-gray-300 text-gray-700 rounded-lg py-3 px-4 pr-10 outline-none appearance-none"
            >
              <option value="">Guruhni tanlang</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.groupName || g.name}
                </option>
              ))}
            </select>
            <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {["Barchasi", "To'langan", "To'lanmagan"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === tab ? "bg-white shadow-sm text-gray-900" : "text-gray-600"}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div>
        {!selectedGroupId ? (
          // Guruh tanlanmagan holat
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <FiAlertCircle className="text-gray-400 text-5xl mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Guruh tanlanmagan
            </h3>
            <p className="text-gray-600">
              Ma'lumotlarni ko'rish uchun guruhni tanlang
            </p>
          </div>
        ) : students.length === 0 ? (
          // Studentlar yo'q
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <FiUser className="text-blue-500 text-5xl mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              O'quvchilar topilmadi
            </h3>
            <p className="text-gray-600">
              {selectedGroup?.groupName} guruhida o'quvchilar yo'q
            </p>
          </div>
        ) : (
          // TABLE - RASMDAGI KO'RINISHDA
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="py-4 px-6 text-left text-gray-600 font-medium text-sm uppercase tracking-wider">
                      O'quvchi
                    </th>
                    <th className="py-4 px-6 text-left text-gray-600 font-medium text-sm uppercase tracking-wider">
                      Guruh
                    </th>
                    <th className="py-4 px-6 text-left text-gray-600 font-medium text-sm uppercase tracking-wider">
                      Darslar
                    </th>
                    <th className="py-4 px-6 text-left text-gray-600 font-medium text-sm uppercase tracking-wider">
                      Izoh
                    </th>
                    <th className="py-4 px-6 text-left text-gray-600 font-medium text-sm uppercase tracking-wider">
                      Holati
                    </th>
                    <th className="py-4 px-6 text-left text-gray-600 font-medium text-sm uppercase tracking-wider">
                      Amal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter((student) => {
                      // Search
                      const fullName =
                        `${student.firstName || ""} ${student.lastName || ""}`.trim();
                      const searchMatch =
                        fullName
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                        (student.phoneNumber || "").includes(searchQuery);

                      // Status filter
                      const hasPayment = currentPayments.find(
                        (p) => p.studentId === student.id,
                      );
                      if (activeTab === "To'langan")
                        return searchMatch && hasPayment;
                      if (activeTab === "To'lanmagan")
                        return searchMatch && !hasPayment;
                      return searchMatch;
                    })
                    .map((student) => {
                      const payment = currentPayments.find(
                        (p) => p.studentId === student.id,
                      );
                      const lessonStatus = getLessonStatus(
                        student,
                        selectedGroup,
                      );
                      const isOverdue =
                        lessonStatus.remainingLessons === 0 && !payment;

                      // Telefon raqami format
                      const phone = student.phoneNumber || "";
                      const formattedPhone =
                        phone.length === 9
                          ? `${phone.slice(0, 3)} ${phone.slice(3, 5)} ${phone.slice(5, 7)} ${phone.slice(7)}`
                          : phone;

                      return (
                        <tr
                          key={student.id}
                          className={`border-b border-gray-100 ${isOverdue ? "bg-red-50" : ""}`}
                        >
                          {/* O'quvchi */}
                          <td className="py-4 px-6">
                            <div>
                              <div className="font-medium text-gray-900">
                                {student.firstName} {student.lastName}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {formattedPhone}
                              </div>
                            </div>
                          </td>

                          {/* Guruh */}
                          <td className="py-4 px-6">
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium">
                              {selectedGroup?.groupName}
                            </span>
                          </td>

                          {/* Darslar */}
                          <td className="py-4 px-6">
                            <div className="text-gray-900 font-medium">
                              {lessonStatus.pastLessons} ta
                            </div>
                          </td>

                          {/* Izoh */}
                          <td className="py-4 px-6">
                            <div className="text-gray-600 text-sm">
                              {getCommentText(student, selectedGroup)}
                            </div>
                          </td>

                          {/* Holati - RASMDAGI KABI */}
                          <td className="py-4 px-6">
                            {payment ? (
                              <div>
                                <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-md text-sm font-medium mb-1">
                                  To'langan
                                </span>
                                <div className="text-green-700 font-semibold">
                                  {payment.amount.toLocaleString()} so'm
                                </div>
                              </div>
                            ) : isOverdue ? (
                              <div>
                                <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-md text-sm font-medium mb-1">
                                  Muddat tugadi
                                </span>
                                <div className="text-red-600 text-sm">
                                  To'lov qilinmagan
                                </div>
                              </div>
                            ) : (
                              <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-md text-sm font-medium">
                                To'lanmagan
                              </span>
                            )}
                          </td>

                          {/* Amal */}
                          <td className="py-4 px-6">
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowModal(true);
                              }}
                              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              <FiDollarSign size={16} />
                              To'lov qo'shish
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {/* No results */}
              {students.filter((student) => {
                const fullName =
                  `${student.firstName || ""} ${student.lastName || ""}`.trim();
                const searchMatch =
                  fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (student.phoneNumber || "").includes(searchQuery);

                const hasPayment = currentPayments.find(
                  (p) => p.studentId === student.id,
                );
                if (activeTab === "To'langan") return searchMatch && hasPayment;
                if (activeTab === "To'lanmagan")
                  return searchMatch && !hasPayment;
                return searchMatch;
              }).length === 0 && (
                <div className="py-12 text-center text-gray-600">
                  Hech narsa topilmadi
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL - TO'LOV QO'SHISH */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  To'lov qo'shish
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedStudent(null);
                    setAmount("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                {/* Student info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">O'quvchi</div>
                  <div className="font-semibold text-gray-900">
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {selectedGroup?.groupName} guruhi
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To'lov miqdori (so'm)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-4 pr-12 outline-none focus:border-blue-500 text-lg font-semibold"
                      placeholder="0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                      so'm
                    </span>
                  </div>
                </div>

                {/* Date */}
                <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-3">
                  <FiCalendar className="text-blue-500" />
                  <div>
                    <div className="text-sm text-blue-700">Sana</div>
                    <div className="font-semibold text-blue-900">{today}</div>
                  </div>
                </div>

                {/* Darslar holati */}
                {selectedGroup && selectedStudent.joinedAt && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 mb-2">
                      Darslar holati
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">
                          O'tgan darslar
                        </div>
                        <div className="font-semibold text-gray-900">
                          {calculatePastLessons(
                            selectedStudent.joinedAt,
                            selectedGroup.days || [],
                          )}{" "}
                          ta
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">
                          Qolgan darslar
                        </div>
                        <div className="font-semibold text-gray-900">
                          {calculateRemainingLessons(
                            calculatePastLessons(
                              selectedStudent.joinedAt,
                              selectedGroup.days || [],
                            ),
                          )}{" "}
                          ta
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedStudent(null);
                      setAmount("");
                    }}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={handlePayment}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Saqlash
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddPayments;
