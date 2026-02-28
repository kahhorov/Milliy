import React, { useState, useEffect } from "react";
import {
  FiX,
  FiCalendar,
  FiClock,
  FiEdit2,
  FiSave,
  FiUser,
  FiSend,
  FiChevronDown,
} from "react-icons/fi";
import { useSelector, useDispatch } from "react-redux";
import {
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { toast } from "react-toastify";
import { sendNotifications } from "../../utils/sendNotification";
import { addNotification } from "../../createSlice/notificationSlice";
import { v4 as uuidv4 } from "uuid";

const HolidayModal = ({
  showModal,
  setShowModal,
  groups,
  onHolidayCreated,
  formatDateToUzbek,
}) => {
  const dispatch = useDispatch();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [groupStudents, setGroupStudents] = useState([]);
  const [sendNotification, setSendNotification] = useState(true);

  // Custom Select uchun ochiq/yopiq holati
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const theme = useSelector((state) => state.theme.value);

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupStudents();
    }
  }, [selectedGroupId]);

  const fetchGroupStudents = async () => {
    try {
      const snapshot = await getDocs(
        collection(db, "groups", selectedGroupId, "students"),
      );
      const students = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGroupStudents(students);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  if (!showModal) return null;

  const handleSubmit = async () => {
    if (!selectedGroupId) {
      toast.warning("Guruhni tanlang!");
      return;
    }
    if (!startDate) {
      toast.warning("Boshlanish sanasini tanlang!");
      return;
    }
    if (!endDate) {
      toast.warning("Tugash sanasini tanlang!");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Tugash sanasi boshlanish sanasidan keyin boʻlishi kerak!");
      return;
    }

    setLoading(true);
    try {
      const selectedGroup = groups.find((g) => g.id === selectedGroupId);

      const holidayData = {
        groupId: selectedGroupId,
        groupName: selectedGroup?.groupName || "Noma'lum",
        startDate: startDate,
        endDate: endDate,
        description: description || "Dam olish kuni",
        createdAt: serverTimestamp(),
        createdBy: "admin",
        isActive: true,
        notificationSent: false,
      };

      // Tatilni saqlash
      await addDoc(collection(db, "holidays"), holidayData);

      // Bildirishnoma yaratish (navbar uchun)
      const notification = {
        id: uuidv4(),
        type: "holiday_created",
        groupId: selectedGroupId,
        groupName: selectedGroup?.groupName || "Noma'lum",
        startDate: startDate,
        endDate: endDate,
        description: description || "Dam olish kuni",
        createdAt: new Date().toISOString(),
        read: false,
      };

      const existing = JSON.parse(
        localStorage.getItem("notifications") || "[]",
      );
      const updated = [notification, ...existing];
      localStorage.setItem("notifications", JSON.stringify(updated));
      dispatch(addNotification(notification));

      // Xabar yuborish
      if (sendNotification && groupStudents.length > 0) {
        const studentsWithTelegram = groupStudents.filter((s) => s.telegramId);

        if (studentsWithTelegram.length > 0) {
          const startDateFormatted = formatDateToUzbek(startDate);
          const endDateFormatted = formatDateToUzbek(endDate);

          const message = `<b>TATIL BOSHLANDI</b>\n\n Guruh: <b>${selectedGroup?.groupName}</b>\n Tatil: <b>${startDateFormatted} ---- ${endDateFormatted}</b>\n Izoh: <i>${description || "Dam olish kuni"}</i>\n\n Tatil muddati davomida darslar boʻlmaydi.\n Tatil tugagach yana xabar beramiz.`;

          const notifications = studentsWithTelegram.map((s) => ({
            telegramId: s.telegramId,
            studentName:
              s.studentName ||
              `${s.firstName || ""} ${s.lastName || ""}`.trim(),
            message: message,
            groupId: selectedGroupId,
            studentId: s.id,
            notificationType: "holiday_start",
          }));

          console.log("Sending holiday notifications:", notifications);

          const result = await sendNotifications(notifications, {
            showToast: false, // Toastni oʻzi koʻrsatmaymiz, natijaga qarab koʻrsatamiz
          });

          console.log("Notification result:", result);

          if (result.success) {
            toast.success(
              <div>
                <div className="font-bold">Tatil belgilandi</div>
                <div className="text-xs opacity-80 mt-1">
                  {result.deliveredCount || 0} ta studentga xabar yuborildi
                </div>
                {(result.failedCount || 0) > 0 && (
                  <div className="text-xs opacity-80 mt-1 text-amber-500">
                    {result.failedCount} ta studentga xabar yuborilmadi
                  </div>
                )}
              </div>,
              {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
              },
            );
          } else {
            toast.error(
              <div>
                <div className="font-bold">Tatil belgilandi</div>
                <div className="text-xs opacity-80 mt-1">
                  0 ta studentga xabar yuborildi
                </div>
                <div className="text-xs opacity-80 mt-1 text-red-400">
                  {studentsWithTelegram.length} ta studentga xabar yuborilmadi
                </div>
              </div>,
              {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
              },
            );
          }
        } else {
          toast.info("Tatil belgilandi. Telegram ID'ga ega studentlar yoʻq");
        }
      } else if (sendNotification && groupStudents.length === 0) {
        toast.info("Tatil belgilandi. Guruhda studentlar yoʻq");
      } else {
        toast.success("Tatil belgilandi");
      }

      // Formani tozalash
      setSelectedGroupId("");
      setStartDate("");
      setEndDate("");
      setDescription("");
      setSendNotification(true);
      setShowModal(false);
    } catch (error) {
      console.error("Error adding holiday:", error);
      toast.error("Xatolik yuz berdi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  // Ekranda guruh nomini koʻrsatish uchun tanlangan guruhni topamiz
  const currentSelectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div
        className={`${theme === "light" ? "bg-white" : "bg-slate-800"} rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in duration-200 overflow-visible relative`}
      >
        {/* HEADER */}
        <div
          className={`${theme === "light" ? "bg-purple-50 border-b border-purple-100" : "bg-purple-900/20 border-b border-purple-800/30"} px-8 py-6 flex justify-between items-center rounded-t-[40px]`}
        >
          <div>
            <h3
              className={`${theme === "light" ? "text-purple-800" : "text-purple-300"} text-xl font-black flex items-center gap-2`}
            >
              <FiCalendar className="text-purple-500" /> Tatil Belgilash
            </h3>
            <p className="text-sm text-slate-500 font-medium">
              Guruh uchun dam olish kunlarini belgilang
            </p>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className={`${theme === "light" ? "hover:bg-purple-200" : "hover:bg-purple-800/50"} p-2 rounded-full text-slate-400 transition-colors`}
          >
            <FiX size={24} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-8 space-y-6">
          {/* Custom Group Select */}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1">
              <FiUser size={12} />
              GURUHNI TANLANG
            </label>

            <div className="relative">
              {/* Select Tugmasi */}
              <div
                onClick={() => setIsSelectOpen(!isSelectOpen)}
                className={`${
                  theme === "light"
                    ? "bg-slate-50 hover:bg-slate-100 text-slate-700"
                    : "bg-slate-700/50 hover:bg-slate-700 text-slate-300"
                } w-full border-2 ${isSelectOpen ? "border-purple-500" : "border-transparent"} rounded-2xl py-0 px-4 font-bold outline-none transition-all cursor-pointer h-14 flex items-center justify-between`}
              >
                <span className="truncate">
                  {currentSelectedGroup
                    ? `${currentSelectedGroup.groupName} (${
                        Array.isArray(currentSelectedGroup.days)
                          ? currentSelectedGroup.days.join(", ")
                          : currentSelectedGroup.days || "Every day"
                      })`
                    : "Tanlang..."}
                </span>
                <FiChevronDown
                  className={`transition-transform duration-200 ${
                    isSelectOpen
                      ? "rotate-180 text-purple-500"
                      : "text-slate-400"
                  }`}
                />
              </div>

              {/* Ochiladigan roʻyxat (Scroll bilan) */}
              {isSelectOpen && (
                <div
                  className={`${
                    theme === "light"
                      ? "bg-white text-slate-700 border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]"
                      : "bg-slate-800 text-slate-300 border-slate-700 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]"
                  } absolute top-[calc(100%+8px)] left-0 w-full rounded-2xl border z-50 max-h-[240px] overflow-y-auto custom-scrollbar`}
                >
                  <div
                    onClick={() => {
                      setSelectedGroupId("");
                      setIsSelectOpen(false);
                    }}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      theme === "light"
                        ? "hover:bg-purple-50 hover:text-purple-600 border-b border-slate-50"
                        : "hover:bg-slate-700 hover:text-purple-300 border-b border-slate-700/50"
                    }`}
                  >
                    Tanlang...
                  </div>

                  {groups.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => {
                        setSelectedGroupId(g.id);
                        setIsSelectOpen(false);
                      }}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        selectedGroupId === g.id
                          ? theme === "light"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-purple-900/40 text-purple-300"
                          : ""
                      } ${
                        theme === "light"
                          ? "hover:bg-purple-50 hover:text-purple-600 border-b border-slate-50 last:border-0"
                          : "hover:bg-slate-700 hover:text-purple-300 border-b border-slate-700/50 last:border-0"
                      }`}
                    >
                      {g.groupName} (
                      {Array.isArray(g.days)
                        ? g.days.join(", ")
                        : g.days || "Every day"}
                      )
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1">
                <FiCalendar size={12} /> BOSHLANISH
              </label>
              <div className="relative">
                <FiClock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`${theme === "light" ? "bg-slate-50 focus:bg-white" : "bg-slate-700"} w-full border-2 border-transparent focus:border-purple-500 rounded-2xl py-4 pl-10 pr-4 font-bold outline-none transition-all`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1">
                <FiCalendar size={12} /> TUGASH
              </label>
              <div className="relative">
                <FiClock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  min={startDate || today}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`${theme === "light" ? "bg-slate-50 focus:bg-white" : "bg-slate-700"} w-full border-2 border-transparent focus:border-purple-500 rounded-2xl py-4 pl-10 pr-4 font-bold outline-none transition-all`}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1">
              <FiEdit2 size={12} /> IZOH
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Masalan: Navroʻz bayrami, Yangi yil ta'tili..."
              rows={2}
              className={`${theme === "light" ? "bg-slate-50 focus:bg-white" : "bg-slate-700"} w-full border-2 border-transparent focus:border-purple-500 rounded-2xl p-4 font-medium outline-none transition-all resize-none`}
            />
          </div>

          {/* Notification Toggle */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                id="sendNotification"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
                className="w-5 h-5 rounded text-purple-600 cursor-pointer accent-purple-600"
              />
            </div>
            <label
              htmlFor="sendNotification"
              className="text-sm font-medium text-slate-400 flex items-center gap-1 cursor-pointer"
            >
              <FiSend /> Oʻquvchilarga xabar yuborish
            </label>
          </div>

          {/* Info Box */}
          {selectedGroupId && startDate && endDate && (
            <div
              className={`${theme === "light" ? "bg-purple-50 border border-purple-100" : "bg-purple-900/20 border border-purple-800/30"} rounded-2xl p-4 animate-in fade-in`}
            >
              <p className="text-sm font-medium flex items-center gap-2">
                <FiCalendar className="text-purple-500" />
                <span
                  className={
                    theme === "light" ? "text-purple-800" : "text-purple-300"
                  }
                >
                  {formatDateToUzbek(startDate)} {formatDateToUzbek(endDate)}
                </span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Bu kunlarda dars oʻtilmaydi va toʻlov muddati uzaytiriladi
              </p>
              {groupStudents.length > 0 && (
                <p className="text-xs text-green-500 mt-2">
                  {groupStudents.filter((s) => s.telegramId).length} ta
                  oʻquvchiga xabar boradi
                </p>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div
          className={`px-8 py-6 ${theme === "light" ? "bg-slate-50 border-t border-slate-100" : "bg-slate-800/50 border-t border-slate-700"} flex gap-3 rounded-b-[40px]`}
        >
          <button
            onClick={() => setShowModal(false)}
            className={`flex-1 py-4 rounded-2xl font-bold transition-all active:scale-95 ${
              theme === "light"
                ? "bg-slate-200 text-slate-600 hover:bg-slate-300"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            Bekor qilish
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`flex-1 py-4 rounded-2xl font-bold text-white transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 ${
              loading
                ? "bg-purple-400 cursor-wait"
                : "bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200"
            }`}
          >
            {loading ? (
              "Saqlanmoqda..."
            ) : (
              <>
                <FiSave /> Saqlash
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HolidayModal;
