import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  InputPicker,
  Table,
  Button,
  Modal,
  InputNumber,
  Stack,
  Message,
  toaster,
} from "rsuite";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { FaCalendarDay, FaCheck, FaTimes, FaRedo } from "react-icons/fa";
import { MdSave, MdEventBusy, MdEventAvailable } from "react-icons/md";
import { TbClockHour4 } from "react-icons/tb";
import { FaPeopleGroup } from "react-icons/fa6";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

const { Column, HeaderCell, Cell } = Table;

function MarkAttendance() {
  const theme = useSelector((state) => state.theme.value);
  const groups = useSelector((state) => state.groups.items);

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedGroupData, setSelectedGroupData] = useState(null);

  // Bugungi kunni aniqlash
  const [selectedDay, setSelectedDay] = useState(() => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[new Date().getDay()];
  });

  const [students, setStudents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [delayMinute, setDelayMinute] = useState(5); // Default 5 daqiqa
  const [isAlreadyMarked, setIsAlreadyMarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const { t } = useTranslation();

  const groupOptions =
    groups?.map((item) => ({
      label: item.groupName,
      value: item.id,
    })) || [];

  // --- LOGIKA: BUGUN DARS BORMI? ---
  const isLessonDay = useMemo(() => {
    if (!selectedGroupData || !selectedGroupData.days) return false;

    const groupDays = selectedGroupData.days; // Array yoki String bo'lishi mumkin

    // Agar "Every day" bo'lsa (Yakshanbadan tashqari har kuni)
    if (Array.isArray(groupDays) && groupDays.includes("Every day")) {
      return selectedDay !== "Sunday";
    }
    // Ba'zan ma'lumot string ko'rinishida kelishi mumkin, shuni ham inobatga olamiz
    if (typeof groupDays === "string" && groupDays === "Every day") {
      return selectedDay !== "Sunday";
    }

    // Oddiy kunlarni tekshirish (masalan: ["Monday", "Wednesday", "Friday"])
    return groupDays.includes(selectedDay);
  }, [selectedGroupData, selectedDay]);

  const checkAnyAttendanceMarked = () => {
    return students.some(
      (student) =>
        student.status === "present" ||
        student.status === "absent" ||
        student.status === "late",
    );
  };

  useEffect(() => {
    if (selectedGroupId && groups?.length > 0) {
      const group = groups.find((g) => g.id === selectedGroupId);
      if (group) {
        setSelectedGroupData(group);
        // Faqat dars kuni bo'lsa studentlarni yuklaymiz
        // Lekin React hook qoidalariga ko'ra bu yerda tekshirish qiyin,
        // shuning uchun checkAttendanceAndFetchStudents ichida tekshiramiz yoki UI da bloklaymiz.
        // UI bloklash afzalroq, lekin ma'lumotni baribir olib kelamiz.
        checkAttendanceAndFetchStudents(group);
      }
    }
  }, [selectedGroupId, selectedDay, groups, attendanceDate]);

  const checkAttendanceAndFetchStudents = async (currentGroup) => {
    setLoading(true);
    try {
      // Bugungi sana bo'yicha davomat borligini tekshirish
      const attQuery = query(
        collection(db, "attendance"),
        where("groupId", "==", currentGroup.id),
        where("date", "==", attendanceDate),
      );
      const attSnapshot = await getDocs(attQuery);

      if (!attSnapshot.empty) {
        setIsAlreadyMarked(true);
        const attendanceData = attSnapshot.docs[0].data();
        setStudents(attendanceData.attendance || []);
      } else {
        setIsAlreadyMarked(false);
        // Talabalarni olish
        const studentsRef = collection(
          db,
          "groups",
          currentGroup.id,
          "students",
        );
        const studentSnapshot = await getDocs(studentsRef);
        setStudents(
          studentSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            status: "pending",
            delay: null,
          })),
        );
      }
    } catch (error) {
      toaster.push(
        <Message type="error" closable>
          {t("An error occurred while loading data!")}
        </Message>,
        { placement: "topCenter" },
      );
    } finally {
      setLoading(false);
      setIsDirty(false);
    }
  };

  const updateStatus = (id, status) => {
    if (isAlreadyMarked) {
      toaster.push(
        <Message type="warning" closable>
          {t("Attendance has already been recorded!")}
        </Message>,
        { placement: "topCenter" },
      );
      return;
    }

    if (status === "late") {
      setActiveStudentId(id);
      setIsModalOpen(true);
    } else {
      setIsDirty(true);
      setStudents((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status, delay: null } : s)),
      );
    }
  };

  const handleDelaySubmit = () => {
    setIsDirty(true);
    setStudents((prev) =>
      prev.map((s) =>
        s.id === activeStudentId
          ? { ...s, status: "late", delay: `${delayMinute} daqiqa` }
          : s,
      ),
    );
    setIsModalOpen(false);
    setDelayMinute(5);
  };

  const handleSaveAttendance = async () => {
    if (!checkAnyAttendanceMarked()) {
      toaster.push(
        <Message type="warning" closable>
          {t("Mark the attendance of at least one student!")}
        </Message>,
        { placement: "topCenter" },
      );
      return;
    }

    if (isAlreadyMarked) {
      toast.warning(t("Today's attendance has already been saved!"));
      return;
    }

    if (!selectedGroupId) {
      toast.warning(t("Please select a group first!"));
      return;
    }

    setSaving(true);
    try {
      const attendanceData = {
        groupId: selectedGroupId,
        groupName: selectedGroupData.groupName,
        lessonTime: selectedGroupData.lessonTime,
        day: selectedDay,
        date: attendanceDate,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        totalStudents: students.length,
        presentCount: students.filter((s) => s.status === "present").length,
        absentCount: students.filter((s) => s.status === "absent").length,
        lateCount: students.filter((s) => s.status === "late").length,
        attendance: students,
      };

      await addDoc(collection(db, "attendance"), attendanceData);
      toast.success(t("Attendance saved successfully!"));
      setIsAlreadyMarked(true);
      setIsDirty(false);
    } catch (error) {
      toast.error(t("An error occurred while saving attendance!"));
    } finally {
      setSaving(false);
    }
  };

  // Statusga qarab qator rangini belgilash
  const getStudentRowStyle = (status) => {
    const baseStyle = {
      borderLeftWidth: "4px",
      transition: "all 0.3s ease",
    };

    switch (status) {
      case "present":
        return {
          ...baseStyle,
          backgroundColor:
            theme === "dark"
              ? "rgba(34, 197, 94, 0.08)"
              : "rgba(34, 197, 94, 0.04)",
          borderLeftColor: "#22c55e",
        };
      case "absent":
        return {
          ...baseStyle,
          backgroundColor:
            theme === "dark"
              ? "rgba(239, 68, 68, 0.08)"
              : "rgba(239, 68, 68, 0.04)",
          borderLeftColor: "#ef4444",
        };
      case "late":
        return {
          ...baseStyle,
          backgroundColor:
            theme === "dark"
              ? "rgba(245, 158, 11, 0.08)"
              : "rgba(245, 158, 11, 0.04)",
          borderLeftColor: "#f59e0b",
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: "transparent",
          borderLeftColor: "transparent",
        };
    }
  };

  const dayNames = {
    Monday: t("Monday"),
    Tuesday: t("Tuesday"),
    Wednesday: t("Wednesday"),
    Thursday: t("Thursday"),
    Friday: t("Friday"),
    Saturday: t("Saturday"),
    Sunday: t("Sunday"),
  };

  // --- YANGILANGAN ActionButton (Chiroyli Badge uslubida) ---
  const ActionButton = ({
    icon: Icon,
    label,
    status,
    rowStatus,
    onClick,
    disabled,
  }) => {
    const isActive = rowStatus === status;

    const getButtonClass = () => {
      // Asosiy klasslar: Badge ko'rinishi, rounded, font-medium
      const baseClass =
        "px-4 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 border transform active:scale-95";

      if (isActive) {
        // Tanlangan holat (Solid rang)
        switch (status) {
          case "present":
            return `${baseClass} bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-500/20`;
          case "absent":
            return `${baseClass} bg-rose-500 hover:bg-rose-600 border-rose-500 text-white shadow-md shadow-rose-500/20`;
          case "late":
            return `${baseClass} bg-amber-500 hover:bg-amber-600 border-amber-500 text-white shadow-md shadow-amber-500/20`;
          default:
            return baseClass;
        }
      }

      if (disabled) {
        return `${baseClass} bg-gray-100 dark:bg-slate-800 text-gray-400 border-transparent cursor-not-allowed opacity-50`;
      }

      // Tanlanmagan (Inactive) holat - Badge uslubi (Light BG + Dark Text)
      switch (status) {
        case "present":
          return `${baseClass} bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20`;
        case "absent":
          return `${baseClass} bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20`;
        case "late":
          return `${baseClass} bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20`;
        default:
          return baseClass;
      }
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={getButtonClass()}
      >
        <Icon className={`${isActive ? "text-white" : ""}`} /> {label}
      </button>
    );
  };

  return (
    <div
      className={`min-h-screen ${theme === "dark" ? "bg-[#0F131A] border border-[#2A2C31]" : "bg-[#FAFAFA] border border-[#E4E4E7]"} rounded-md`}
    >
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div
          className={`mb-6 p-6 rounded-2xl ${theme === "dark" ? "bg-slate-900" : "bg-white"} shadow-sm`}
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1
                className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}
              >
                {t("Take attendance")}
              </h1>
              <p
                className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
              >
                {t("Select a group and record students' attendance")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <InputPicker
                data={groupOptions}
                className={`w-full sm:w-64 ${theme === "dark" ? "dark:bg-slate-800 dark:border-slate-700" : ""}`}
                placeholder={t("Select group")}
                onChange={setSelectedGroupId}
                value={selectedGroupId}
                size="lg"
              />

              <div
                className={`px-4 py-2 rounded-lg flex items-center justify-center ${theme === "dark" ? "bg-slate-800" : "bg-slate-100"}`}
              >
                <p
                  className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
                >
                  {t(selectedDay)} •{" "}
                  {selectedDay ===
                  new Date().toLocaleDateString("en-US", { weekday: "long" })
                    ? t("Today")
                    : ""}
                </p>
              </div>
            </div>
          </div>
        </div>

        {selectedGroupId ? (
          <>
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* 1. Guruh nomi */}
              <div
                className={`p-4 rounded-xl ${theme === "dark" ? "bg-slate-900" : "bg-white"} border ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-lg ${theme === "dark" ? "bg-blue-900/40" : "bg-blue-100"} text-blue-600 dark:text-blue-400`}
                  >
                    <FaPeopleGroup />
                  </div>
                  <div>
                    <p
                      className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                    >
                      {t("Group")}
                    </p>
                    <p
                      className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}
                    >
                      {selectedGroupData?.groupName}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Dars vaqti */}
              <div
                className={`p-4 rounded-xl ${theme === "dark" ? "bg-slate-900" : "bg-white"} border ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-lg ${theme === "dark" ? "bg-emerald-900/40" : "bg-emerald-100"} text-emerald-600 dark:text-emerald-400`}
                  >
                    <TbClockHour4 />
                  </div>
                  <div>
                    <p
                      className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                    >
                      {t("Class time")}
                    </p>
                    <p
                      className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}
                    >
                      {selectedGroupData?.lessonTime}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Kun */}
              <div
                className={`p-4 rounded-xl ${theme === "dark" ? "bg-slate-900" : "bg-white"} border ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-lg ${theme === "dark" ? "bg-purple-900/40" : "bg-purple-100"} text-purple-600 dark:text-purple-400`}
                  >
                    <FaCalendarDay />
                  </div>
                  <div>
                    <p
                      className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                    >
                      {t("Day")}
                    </p>
                    <p
                      className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}
                    >
                      {dayNames[selectedDay]}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Saqlash tugmasi */}
              <div
                className={`p-4 rounded-xl flex items-center justify-center ${theme === "dark" ? "bg-slate-900" : "bg-white"} border ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}
              >
                <Button
                  appearance="primary"
                  color="green"
                  startIcon={<MdSave />}
                  className="w-full h-full font-semibold"
                  onClick={handleSaveAttendance}
                  disabled={
                    !isDirty || isAlreadyMarked || saving || !isLessonDay
                  }
                  loading={saving}
                >
                  {isAlreadyMarked ? t("Saved") : t("Save")}
                </Button>
              </div>
            </div>

            {/* --- AGAR BUGUN DARS KUNI BO'LMASA --- */}
            {!isLessonDay ? (
              <div
                className={`flex flex-col items-center justify-center p-12 rounded-2xl border-2 border-dashed ${theme === "dark" ? "bg-slate-900/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}
              >
                <div
                  className={`p-4 rounded-full mb-4 ${theme === "dark" ? "bg-orange-900/20 text-orange-400" : "bg-orange-100 text-orange-500"}`}
                >
                  <MdEventBusy className="text-4xl" />
                </div>
                <h3
                  className={`text-xl font-bold mb-2 ${theme === "dark" ? "text-white" : "text-slate-800"}`}
                >
                  {t("No class today")}
                </h3>
                <p
                  className={`text-center max-w-md ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                >
                  {t("This group does not have a class scheduled for today")} (
                  {dayNames[selectedDay]}).
                  <br />
                  {t("Check the group schedule.")}
                </p>

                {/* Guruh kunlarini ko'rsatish */}
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  <span
                    className={`text-xs px-2 py-1 rounded ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}
                  >
                    {t("Scheduled days:")}
                  </span>
                  {Array.isArray(selectedGroupData?.days) ? (
                    selectedGroupData.days.map((d, i) => (
                      <span
                        key={i}
                        className={`text-xs px-3 py-1 rounded-full font-medium ${theme === "dark" ? "bg-slate-800 text-slate-300" : "bg-white border text-slate-600"}`}
                      >
                        {d === "Every day"
                          ? t("Every day (Mon-Sat)")
                          : dayNames[d] || d}
                      </span>
                    ))
                  ) : (
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${theme === "dark" ? "bg-slate-800 text-slate-300" : "bg-white border text-slate-600"}`}
                    >
                      {selectedGroupData?.days === "Every day"
                        ? t("Every day (Mon-Sat)")
                        : selectedGroupData?.days}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              /* --- AGAR DARS KUNI BO'LSA, DAVOMAT JADVALI CHIQADI --- */
              <>
                {isAlreadyMarked && (
                  <div
                    className={`mb-6 p-4 rounded-xl ${theme === "dark" ? "bg-emerald-900/20 border-emerald-800" : "bg-emerald-50 border-emerald-200"} border`}
                  >
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                          <MdEventAvailable className="text-emerald-600 dark:text-emerald-400 text-xl" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            {t("Attendance saved")}
                          </p>
                          <p className="text-sm text-emerald-600 dark:text-emerald-400 opacity-80">
                            {attendanceDate}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-6">
                        <div className="text-center">
                          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {
                              students.filter((s) => s.status === "present")
                                .length
                            }
                          </div>
                          <div className="text-[8px] md:text-xs font-medium text-emerald-500 dark:text-emerald-500 uppercase tracking-wide">
                            {t("Present")}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                            {students.filter((s) => s.status === "late").length}
                          </div>
                          <div className="text-[8px] md:text-xs font-medium text-amber-500 dark:text-amber-500 uppercase tracking-wide">
                            {t("Late")}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
                            {
                              students.filter((s) => s.status === "absent")
                                .length
                            }
                          </div>
                          <div className="text-[8px] md:text-xs font-medium text-rose-500 dark:text-rose-500 uppercase tracking-wide">
                            {t("Absent")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Table */}
                <div
                  className={`rounded-xl overflow-hidden shadow-sm attendance-table-wrap ${theme === "dark" ? "bg-slate-900" : "bg-white"} border ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}
                >
                  <Table
                    autoHeight
                    data={students}
                    loading={loading}
                    rowHeight={75}
                    rowStyle={(rowData) => getStudentRowStyle(rowData.status)}
                    headerHeight={60}
                    className="attendance-table"
                  >
                    <Column width={60} align="center" fixed>
                      <HeaderCell
                        className={`font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
                      >
                        №
                      </HeaderCell>
                      <Cell>
                        {(_, index) => (
                          <div
                            className={`font-medium mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                          >
                            {index + 1}
                          </div>
                        )}
                      </Cell>
                    </Column>

                    <Column flexGrow={2} minWidth={200} verticalAlign="middle">
                      <HeaderCell
                        className={`font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
                      >
                        {t("Students")}
                      </HeaderCell>
                      <Cell>
                        {(rowData) => (
                          <div className="py-1">
                            <div
                              className={`text-base font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"} `}
                            >
                              {rowData.studentName} {rowData.lastName}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                              <span className="opacity-70">📞</span> +998{" "}
                              {rowData.phoneNumber || t("No phone number")}
                            </div>
                          </div>
                        )}
                      </Cell>
                    </Column>

                    <Column width={500} align="center" verticalAlign="middle">
                      <HeaderCell
                        className={`font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
                      >
                        {t("Actions")}
                      </HeaderCell>
                      <Cell>
                        {(rowData) => {
                          const isAnyStatusSelected =
                            rowData.status !== "pending";

                          return (
                            <div className="flex items-center justify-center gap-3 w-full">
                              {/* Keldi */}
                              <ActionButton
                                icon={FaCheck}
                                label={t("Present")}
                                status="present"
                                rowStatus={rowData.status}
                                onClick={() =>
                                  updateStatus(rowData.id, "present")
                                }
                                disabled={
                                  isAlreadyMarked || isAnyStatusSelected
                                }
                              />

                              {/* Kelmadi */}
                              <ActionButton
                                icon={FaTimes}
                                label={t("Absent")}
                                status="absent"
                                rowStatus={rowData.status}
                                onClick={() =>
                                  updateStatus(rowData.id, "absent")
                                }
                                disabled={
                                  isAlreadyMarked || isAnyStatusSelected
                                }
                              />

                              {/* Kechikdi */}
                              <ActionButton
                                icon={TbClockHour4}
                                label={t("Late")}
                                status="late"
                                rowStatus={rowData.status}
                                onClick={() => updateStatus(rowData.id, "late")}
                                disabled={
                                  isAlreadyMarked || isAnyStatusSelected
                                }
                              />

                              {/* Reset */}
                              {isAnyStatusSelected && !isAlreadyMarked && (
                                <button
                                  title={t("Reset status")}
                                  onClick={() => {
                                    setStudents((prev) =>
                                      prev.map((s) =>
                                        s.id === rowData.id
                                          ? {
                                              ...s,
                                              status: "pending",
                                              delay: null,
                                            }
                                          : s,
                                      ),
                                    );
                                    setIsDirty(true);
                                  }}
                                  className={`p-2.5 rounded-xl ml-1 ${
                                    theme === "dark"
                                      ? "bg-slate-800 hover:bg-slate-700 text-slate-400"
                                      : "bg-slate-100 hover:bg-slate-200 text-slate-500"
                                  } transition-colors`}
                                >
                                  <FaRedo className="text-sm" />
                                </button>
                              )}
                            </div>
                          );
                        }}
                      </Cell>
                    </Column>
                  </Table>

                  {students.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="text-4xl mb-3">👨‍🎓</div>
                      <p
                        className={`text-sm font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
                      >
                        {t("There are no students in the group")}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <div
            className={`h-[50vh] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center ${theme === "dark" ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-300"} select-none`}
          >
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-4 ${theme === "dark" ? "bg-slate-800" : "bg-slate-100"}`}
            >
              📚
            </div>
            <h3
              className={`text-lg font-bold mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
            >
              {t("Select group")}
            </h3>
            <p
              className={`text-center max-w-sm text-sm ${theme === "dark" ? "text-slate-500" : "text-slate-600"}`}
            >
              {t("Select group to attend")}
            </p>
          </div>
        )}

        {/* Modal - Kechikish vaqti */}
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          size="xs"
          backdrop="static"
        >
          <Modal.Header>
            <Modal.Title
              className={`font-medium ${theme === "dark" ? "text-white" : "text-slate-900"}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${theme === "dark" ? "bg-amber-900/40" : "bg-amber-100"}`}
                >
                  <TbClockHour4 className="text-amber-600 dark:text-amber-400 text-xl" />
                </div>
                <div>
                  <div className="font-bold">{t("Delay time")}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                    {t("How many minutes was the student late?")}
                  </div>
                </div>
              </div>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="py-6">
            <div className="text-center mb-6">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                {t("Student")}:
              </p>
              <p className="text-lg font-bold dark:text-white">
                {students.find((s) => s.id === activeStudentId)?.studentName ||
                  t("Student")}
              </p>
            </div>

            <Stack justifyContent="center" className="mb-6">
              <InputNumber
                type="number"
                defaultValue={delayMinute}
                min={1}
                max={90}
                size="lg"
                onChange={(v) => setDelayMinute(Number(v))}
                style={{ width: 140 }}
                className="text-center font-bold text-lg"
              />
            </Stack>

            <div className="text-center">
              <div
                className={`inline-block px-4 py-2 rounded-lg border ${theme === "dark" ? "bg-amber-900/20 border-amber-800" : "bg-amber-50 border-amber-100"}`}
              >
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  {delayMinute} {t("Minute")}
                </span>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => setIsModalOpen(false)}
              appearance="subtle"
              className="mr-2"
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleDelaySubmit}
              appearance="primary"
              color="orange"
              className="px-6 font-semibold"
            >
              {t("Confirmation")}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}

export default MarkAttendance;
