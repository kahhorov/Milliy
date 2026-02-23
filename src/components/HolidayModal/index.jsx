import React, { useState, useEffect } from "react";
import {
  FiX,
  FiCalendar,
  FiClock,
  FiEdit2,
  FiSave,
  FiUser,
  FiSend,
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
      toast.error("Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak!");
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
      const docRef = await addDoc(collection(db, "holidays"), holidayData);

      // Birinchi toast - Tatil belgilandi
      toast.success("Tatil muvaffaqiyatli belgilandi!");

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

          const message = `🏖 <b>TATIL BOSHLANDI</b>\n\n📚 Guruh: <b>${selectedGroup?.groupName}</b>\n📅 Tatil: <b>${startDateFormatted} — ${endDateFormatted}</b>\n📝 Izoh: <i>${description || "Dam olish kuni"}</i>\n\n✨ Tatil muddati davomida darslar bo'lmaydi.\n🔔 Tatil tugagach yana xabar beramiz.`;

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
            showToast: false, // Toastni o'zi ko'rsatmaymiz, natijaga qarab ko'rsatamiz
          });

          console.log("Notification result:", result);

          if (result.success) {
            // Ikkinchi toast - Xabar yuborildi
            toast.success(
              <div>
                <div className="font-bold">Xabar yuborildi</div>
                <div className="text-xs opacity-80 mt-1">
                  {result.deliveredCount} ta o'quvchiga tatil xabari yuborildi
                </div>
              </div>,
              {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                // theme: "colored",
              },
            );
          } else {
            // Ikkinchi toast - Xabar yuborilmadi
            toast.error(
              <div>
                <div className="font-bold">Xabar yuborilmadi</div>
                <div className="text-xs opacity-80 mt-1">
                  {result.error === "Connection failed"
                    ? "Backend serverga ulanib bo'lmadi. Server ishga tushganligini tekshiring."
                    : "Xabar yuborishda xatolik yuz berdi."}
                </div>
              </div>,
              {
                position: "top-right",
                autoClose: 7000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                // theme: "colored",
              },
            );
          }
        } else {
          toast.info("Telegram ID'ga ega o'quvchilar yo'q");
        }
      } else if (sendNotification && groupStudents.length === 0) {
        toast.info("Guruhda o'quvchilar yo'q");
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

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div
        className={`${theme === "light" ? "bg-white" : "bg-slate-800"} rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in duration-200 overflow-hidden relative`}
      >
        {/* HEADER */}
        <div
          className={`${theme === "light" ? "bg-purple-50 border-b border-purple-100" : "bg-purple-900/20 border-b border-purple-800/30"} px-8 py-6 flex justify-between items-center`}
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
          {/* Group Select */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1">
              <FiUser size={12} />
              GURUHNI TANLANG
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className={`${theme === "light" ? "bg-slate-50 focus:bg-white text-slate-700" : "bg-slate-700/50 text-slate-300"} w-full border-2 border-transparent focus:border-purple-500 rounded-2xl py-4 px-4 font-bold outline-none transition-all cursor-pointer`}
            >
              <option value="">Tanlang...</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.groupName} (
                  {Array.isArray(g.days)
                    ? g.days.join(", ")
                    : g.days || "Every day"}
                  )
                </option>
              ))}
            </select>
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
              placeholder="Masalan: Navro'z bayrami, Yangi yil ta'tili..."
              rows={2}
              className={`${theme === "light" ? "bg-slate-50 focus:bg-white" : "bg-slate-700"} w-full border-2 border-transparent focus:border-purple-500 rounded-2xl p-4 font-medium outline-none transition-all resize-none`}
            />
          </div>

          {/* Notification Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="sendNotification"
              checked={sendNotification}
              onChange={(e) => setSendNotification(e.target.checked)}
              className="w-5 h-5 rounded text-purple-600"
            />
            <label
              htmlFor="sendNotification"
              className="text-sm font-medium text-slate-400 flex items-center gap-1"
            >
              <FiSend /> O'quvchilarga xabar yuborish
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
                  {formatDateToUzbek(startDate)} — {formatDateToUzbek(endDate)}
                </span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Bu kunlarda dars o'tilmaydi va to'lov muddati uzaytiriladi
              </p>
              {groupStudents.length > 0 && (
                <p className="text-xs text-green-500 mt-2">
                  📱 {groupStudents.filter((s) => s.telegramId).length} ta
                  o'quvchiga xabar boradi
                </p>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div
          className={`px-8 py-6 ${theme === "light" ? "bg-slate-50 border-t border-slate-100" : "bg-slate-800/50 border-t border-slate-700"} flex gap-3`}
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
