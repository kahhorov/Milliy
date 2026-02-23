import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiBell,
  FiCalendar,
  FiTrash2,
  FiChevronLeft,
  FiClock,
  FiInfo,
  FiUmbrella,
  FiAlertCircle,
  FiCheck,
} from "react-icons/fi";
import { MdOutlineGroups } from "react-icons/md";
import {
  Button,
  Whisper,
  Tooltip,
  Loader,
  Modal,
  IconButton,
  Tabs,
  Badge,
} from "rsuite";
import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import {
  markAsRead,
  markAllAsRead,
  setNotifications,
} from "../../createSlice/notificationSlice";
import { useUzbekTime } from "../../hooks/useUzbekTime";
import { toast } from "react-toastify";

const Notifications = () => {
  const theme = useSelector((state) => state.theme.value);
  const { notifications, unreadCount, readNotifications } = useSelector(
    (state) => state.notifications,
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState({
    show: false,
    type: null,
  });
  const [holidays, setHolidays] = useState([]);
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    type: null,
  });
  const [activeTab, setActiveTab] = useState("all");
  const [progress, setProgress] = useState({});
  const [sparkle, setSparkle] = useState({});
  const { formatUzbekDateReadable, todayStr } = useUzbekTime();

  const isDark = theme === "dark";

  // Fetch holidays
  useEffect(() => {
    const q = query(collection(db, "holidays"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const holidaysList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setHolidays(holidaysList);
    });
    return () => unsubscribe();
  }, []);

  // Load notifications from localStorage on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("notifications") || "[]");
      dispatch(setNotifications(stored));
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  }, [dispatch]);

  // Check for expired holidays and update their status
  useEffect(() => {
    const checkExpiredHolidays = async () => {
      try {
        if (!todayStr) return;

        // Find holidays that have ended but are still active
        const expiredHolidays = holidays.filter(
          (h) => h.endDate < todayStr && h.isActive !== false,
        );

        for (const holiday of expiredHolidays) {
          // Update isActive to false in Firebase
          await updateDoc(doc(db, "holidays", holiday.id), {
            isActive: false,
          });

          console.log(`Holiday ${holiday.id} has expired and been deactivated`);
        }
      } catch (error) {
        console.error("Error checking expired holidays:", error);
      }
    };

    checkExpiredHolidays();
  }, [holidays, todayStr]);

  // Calculate progress for active holidays
  useEffect(() => {
    try {
      const activeHolidays = holidays.filter(
        (h) => h.endDate >= todayStr && h.isActive !== false,
      );
      const newProgress = {};

      activeHolidays.forEach((holiday) => {
        if (!holiday.startDate || !holiday.endDate) return;

        const start = new Date(holiday.startDate).getTime();
        const end = new Date(holiday.endDate).getTime();
        const now = new Date(todayStr).getTime();

        if (isNaN(start) || isNaN(end) || isNaN(now)) return;

        const total = end - start;
        const passed = now - start;
        const progressValue = Math.max(
          0,
          Math.min(100, (passed / total) * 100),
        );

        newProgress[holiday.id] = progressValue;
      });

      setProgress(newProgress);
    } catch (error) {
      console.error("Error calculating progress:", error);
    }
  }, [holidays, todayStr]);

  // Update progress every minute with sparkle effect
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const activeHolidays = holidays.filter(
          (h) => h.endDate >= todayStr && h.isActive !== false,
        );
        const newProgress = {};
        const newSparkle = {};

        activeHolidays.forEach((holiday) => {
          if (!holiday.startDate || !holiday.endDate) return;

          const start = new Date(holiday.startDate).getTime();
          const end = new Date(holiday.endDate).getTime();
          const now = new Date(todayStr).getTime();

          if (isNaN(start) || isNaN(end) || isNaN(now)) return;

          const total = end - start;
          const passed = now - start;
          const progressValue = Math.max(
            0,
            Math.min(100, (passed / total) * 100),
          );

          newProgress[holiday.id] = progressValue;

          // Sparkle effect when progress increases
          if (progress[holiday.id] && progress[holiday.id] < progressValue) {
            newSparkle[holiday.id] = true;
            setTimeout(() => {
              setSparkle((prev) => ({ ...prev, [holiday.id]: false }));
            }, 500);
          }
        });

        setProgress(newProgress);
        setSparkle(newSparkle);
      } catch (error) {
        console.error("Error in progress interval:", error);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [holidays, todayStr, progress]);

  // Check for newly ended holidays and create notifications
  useEffect(() => {
    const checkNewlyEndedHolidays = () => {
      try {
        if (!todayStr) return;

        const today = new Date(todayStr);
        if (isNaN(today.getTime())) {
          console.error("Invalid today date:", todayStr);
          return;
        }

        holidays.forEach((holiday) => {
          if (!holiday || !holiday.id || !holiday.endDate) return;

          // Agar holiday endDate = today bo'lsa va hali notification yuborilmagan bo'lsa
          if (holiday.endDate === todayStr && !holiday.notificationSent) {
            const notificationId = `ended_${holiday.id}`;

            // Check if already in notifications
            const exists = notifications.some((n) => n.id === notificationId);

            if (!exists) {
              const newNotification = {
                id: notificationId,
                type: "holiday_ended",
                groupId: holiday.groupId,
                groupName: holiday.groupName || "Noma'lum guruh",
                startDate: holiday.startDate || "",
                endDate: holiday.endDate || "",
                description: holiday.description || "",
                createdAt: new Date().toISOString(),
                read: false,
              };

              const updatedNotifications = [newNotification, ...notifications];
              localStorage.setItem(
                "notifications",
                JSON.stringify(updatedNotifications),
              );
              dispatch(setNotifications(updatedNotifications));

              // Mark as notification sent
              if (holiday.id) {
                updateDoc(doc(db, "holidays", holiday.id), {
                  notificationSent: true,
                }).catch((err) =>
                  console.error("Error updating holiday:", err),
                );
              }
            }
          }
        });
      } catch (error) {
        console.error("Error in checkNewlyEndedHolidays:", error);
      }
    };

    checkNewlyEndedHolidays();
  }, [holidays, todayStr, notifications, dispatch]);

  // Separate holidays - faqat isActive bo'yicha filter
  const activeHolidays = holidays
    .filter((h) => h.endDate >= todayStr && h.isActive !== false)
    .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

  const endedHolidays = holidays
    .filter((h) => h.endDate < todayStr || h.isActive === false)
    .sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

  // All holidays for "all" tab
  const allHolidays = [...activeHolidays, ...endedHolidays].sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
    return dateB - dateA;
  });

  // Get current items based on tab
  const getCurrentItems = () => {
    switch (activeTab) {
      case "active":
        return activeHolidays;
      case "ended":
        return endedHolidays;
      default:
        return allHolidays;
    }
  };

  const currentItems = getCurrentItems();

  const handleMarkAsRead = (id) => {
    dispatch(markAsRead(id));

    // Update localStorage
    const stored = JSON.parse(localStorage.getItem("notifications") || "[]");
    const updated = stored.map((n) => (n.id === id ? { ...n, read: true } : n));
    localStorage.setItem("notifications", JSON.stringify(updated));
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());

    // Update localStorage - barchasini o'qilgan deb belgilash
    const stored = JSON.parse(localStorage.getItem("notifications") || "[]");
    const updated = stored.map((n) => ({ ...n, read: true }));
    localStorage.setItem("notifications", JSON.stringify(updated));

    setShowClearModal(false);
    toast.success("Barcha bildirishnomalar o'qilgan deb belgilandi");
  };

  const handleDeleteHoliday = async () => {
    if (!deleteModal.id) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, "holidays", deleteModal.id));

      // Remove from notifications if exists
      const notificationId = `ended_${deleteModal.id}`;
      const updatedNotifications = notifications.filter(
        (n) => n.id !== notificationId,
      );
      localStorage.setItem(
        "notifications",
        JSON.stringify(updatedNotifications),
      );
      dispatch(setNotifications(updatedNotifications));

      toast.success("Tatil muvaffaqiyatli o'chirildi");
      setDeleteModal({ show: false, id: null, type: null });
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllInCurrentTab = async () => {
    setLoading(true);
    try {
      const itemsToDelete = currentItems;

      for (const item of itemsToDelete) {
        await deleteDoc(doc(db, "holidays", item.id));

        // Remove from notifications
        const notificationId = `ended_${item.id}`;
        const updatedNotifications = notifications.filter(
          (n) => n.id !== notificationId,
        );
        localStorage.setItem(
          "notifications",
          JSON.stringify(updatedNotifications),
        );
        dispatch(setNotifications(updatedNotifications));
      }

      const typeText =
        activeTab === "active"
          ? "aktiv"
          : activeTab === "ended"
            ? "tugagan"
            : "barcha";
      toast.success(` ${itemsToDelete.length} ta ${typeText} tatil o'chirildi`);
      setShowDeleteAllModal({ show: false, type: null });
    } catch (error) {
      console.error("Error deleting all:", error);
      toast.error("Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader size="lg" content="Yuklanmoqda..." vertical />
      </div>
    );
  }

  // Get tab title with count
  const getTabTitle = (tab) => {
    const counts = {
      all: allHolidays.length,
      active: activeHolidays.length,
      ended: endedHolidays.length,
    };

    const labels = {
      all: "Barchasi",
      active: "Faol",
      ended: "Tugagan",
    };

    return (
      <div className="flex items-center gap-2">
        <span>{labels[tab]}</span>
        <Badge
          content={counts[tab]}
          color={tab === "active" ? "green" : tab === "ended" ? "red" : "blue"}
        />
      </div>
    );
  };

  return (
    <div className="space-y-8 notifications-container">
      {/* Header */}
      <div
        className={`flex items-center ${
          isMobile ? "flex-col gap-4" : "justify-between"
        }`}
      >
        <div className="flex items-center gap-4 w-full">
          <Button
            appearance="subtle"
            onClick={handleBack}
            className={`!rounded-full !w-10 !h-10 ${
              isDark ? "text-white hover:bg-white/10" : "text-gray-700"
            }`}
          >
            <FiChevronLeft size={24} />
          </Button>
          <h1
            className={`text-2xl font-black flex items-center gap-2 ${
              isMobile ? "flex-1" : ""
            }`}
          >
            <FiBell className={isDark ? "text-cyan-400" : "text-cyan-600"} />
            Bildirishnomalar
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-full animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Mark All as Read Button - faqat o'qilmaganlar bo'lsa */}
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button
            appearance="primary"
            color="green"
            onClick={() => setShowClearModal(true)}
            className="!rounded-full !px-6 !py-3 font-bold shadow-lg hover:shadow-xl transition-all"
          >
            <FiCheck className="mr-2" />
            Barchasini o'qilgan deb belgilash ({unreadCount})
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onSelect={setActiveTab}
        appearance="subtle"
        className="mb-4"
      >
        <Tabs.Tab eventKey="all" title={getTabTitle("all")} />
        <Tabs.Tab eventKey="active" title={getTabTitle("active")} />
        <Tabs.Tab eventKey="ended" title={getTabTitle("ended")} />
      </Tabs>

      {/* Delete All Button for current tab */}
      {currentItems.length > 0 && (
        <div className="flex justify-end mb-4">
          <Button
            appearance="primary"
            color="red"
            onClick={() =>
              setShowDeleteAllModal({ show: true, type: activeTab })
            }
            className="!rounded-full !px-6 !py-2 font-bold shadow-lg hover:shadow-xl transition-all"
          >
            <FiTrash2 className="mr-2" />
            {activeTab === "all" && "Barcha tatillarni o'chirish"}
            {activeTab === "active" && "Barcha aktiv tatillarni o'chirish"}
            {activeTab === "ended" && "Barcha tugagan tatillarni o'chirish"} (
            {currentItems.length})
          </Button>
        </div>
      )}

      {/* Items List */}
      {currentItems.length > 0 ? (
        <div className="space-y-4">
          {currentItems.map((item) => {
            const isActive =
              item.endDate >= todayStr && item.isActive !== false;
            const isNew =
              notifications.some((n) => n.id === `ended_${item.id}`) &&
              !readNotifications.includes(`ended_${item.id}`);

            return (
              <div
                key={item.id}
                className={`p-6 rounded-3xl transition-all duration-300 hover:shadow-xl ${
                  isDark
                    ? isActive
                      ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20"
                      : "bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/20"
                    : isActive
                      ? "bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200"
                      : "bg-gradient-to-br from-red-50 to-rose-50 border border-red-200"
                } ${isNew ? "ring-2 ring-yellow-400" : ""} ${
                  sparkle[item.id] ? "animate-sparkle" : ""
                }`}
              >
                <div className="flex flex-col gap-4">
                  {/* Header with group name and delete button */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MdOutlineGroups
                        className={
                          isDark
                            ? isActive
                              ? "text-green-400"
                              : "text-red-400"
                            : isActive
                              ? "text-green-600"
                              : "text-red-600"
                        }
                        size={20}
                      />
                      <h3
                        className={`text-lg font-bold ${
                          isDark
                            ? isActive
                              ? "text-green-300"
                              : "text-red-300"
                            : isActive
                              ? "text-green-800"
                              : "text-red-800"
                        }`}
                      >
                        {item.groupName}
                      </h3>
                      <span
                        className={`${
                          isActive
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                        } text-xs px-2 py-1 rounded-full`}
                      >
                        {isActive ? "Faol" : "Tugagan"}
                      </span>
                      {isNew && (
                        <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full animate-pulse">
                          Yangi
                        </span>
                      )}
                    </div>

                    {/* Delete button */}
                    <Whisper
                      trigger="hover"
                      placement="left"
                      speaker={<Tooltip>Tatilni o'chirish</Tooltip>}
                    >
                      <IconButton
                        icon={<FiTrash2 />}
                        appearance="subtle"
                        onClick={() =>
                          setDeleteModal({
                            show: true,
                            id: item.id,
                            type: "holiday",
                          })
                        }
                        className={`!rounded-full !w-10 !h-10 ${
                          isDark
                            ? "text-red-400 hover:bg-red-500/20"
                            : "text-red-500 hover:bg-red-100"
                        }`}
                      />
                    </Whisper>
                  </div>

                  {/* Dates in column */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <FiCalendar
                        className={isDark ? "text-gray-400" : "text-gray-500"}
                        size={14}
                      />
                      <span
                        className={`text-sm ${
                          isDark ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        <span className="font-bold">Boshlangan:</span>{" "}
                        {formatUzbekDateReadable(item.startDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <FiCalendar
                        className={
                          isDark
                            ? isActive
                              ? "text-amber-400"
                              : "text-red-400"
                            : isActive
                              ? "text-amber-500"
                              : "text-red-500"
                        }
                        size={14}
                      />
                      <span
                        className={`text-sm ${
                          isDark ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        <span className="font-bold">
                          {isActive ? "Tugaydi:" : "Tugagan:"}
                        </span>{" "}
                        {formatUzbekDateReadable(item.endDate)}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {item.description && (
                    <div
                      className={`text-sm p-3 rounded-xl ${
                        isDark
                          ? "bg-black/20 text-gray-300"
                          : "bg-white/60 text-gray-600"
                      }`}
                    >
                      <span className="font-bold">Izoh:</span> "
                      {item.description}"
                    </div>
                  )}

                  {/* Progress bar - only for active holidays */}
                  {isActive && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span
                          className={isDark ? "text-gray-400" : "text-gray-500"}
                        >
                          Boshlangan
                        </span>
                        <span
                          className={isDark ? "text-gray-400" : "text-gray-500"}
                        >
                          Tugashiga{" "}
                          {Math.ceil(
                            (new Date(item.endDate) - new Date(todayStr)) /
                              (1000 * 60 * 60 * 24),
                          )}{" "}
                          kun
                        </span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden relative">
                        <div
                          className={`h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-1000 ease-out ${
                            sparkle[item.id] ? "animate-progress-sparkle" : ""
                          }`}
                          style={{ width: `${progress[item.id] || 0}%` }}
                        />
                        {/* Sparkle dots */}
                        {sparkle[item.id] && (
                          <div className="absolute inset-0 flex justify-around items-center">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className="w-1 h-1 bg-white rounded-full animate-ping"
                                style={{
                                  left: `${Math.random() * 100}%`,
                                  animationDelay: `${i * 0.1}s`,
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div
          className={`text-center py-20 rounded-3xl ${
            isDark ? "bg-white/5" : "bg-gray-50"
          }`}
        >
          <FiBell
            size={64}
            className={`mx-auto mb-4 ${
              isDark ? "text-gray-600" : "text-gray-300"
            }`}
          />
          <p
            className={`text-lg font-medium ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {activeTab === "all" && "Sizda hali tatillar yo'q"}
            {activeTab === "active" && "Aktiv tatillar mavjud emas"}
            {activeTab === "ended" && "Tugagan tatillar mavjud emas"}
          </p>
          <Button appearance="subtle" onClick={handleBack} className="mt-4">
            Orqaga qaytish
          </Button>
        </div>
      )}

      {/* Delete Single Item Modal */}
      <Modal
        open={deleteModal.show}
        onClose={() => setDeleteModal({ show: false, id: null, type: null })}
        size="xs"
        backdrop="static"
        className={isDark ? "dark-theme-modal" : ""}
      >
        <Modal.Header>
          <Modal.Title className="font-black flex items-center gap-2">
            <FiInfo className="text-red-500" />
            O'chirishni tasdiqlang
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className={isDark ? "text-gray-300" : "text-gray-600"}>
            Bu tatilni o'chirishni tasdiqlaysizmi?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={handleDeleteHoliday}
            color="red"
            appearance="primary"
          >
            Ha, o'chirish
          </Button>
          <Button
            onClick={() =>
              setDeleteModal({ show: false, id: null, type: null })
            }
            appearance="subtle"
          >
            Bekor qilish
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete All in Tab Modal */}
      <Modal
        open={showDeleteAllModal.show}
        onClose={() => setShowDeleteAllModal({ show: false, type: null })}
        size="xs"
        backdrop="static"
        className={isDark ? "dark-theme-modal" : ""}
      >
        <Modal.Header>
          <Modal.Title className="font-black flex items-center gap-2">
            <FiInfo className="text-red-500" />
            Barchasini o'chirishni tasdiqlang
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className={isDark ? "text-gray-300" : "text-gray-600"}>
            {showDeleteAllModal.type === "all" &&
              `Barcha tatillarni (${currentItems.length} ta) o'chirishni tasdiqlaysizmi?`}
            {showDeleteAllModal.type === "active" &&
              `Barcha aktiv tatillarni (${currentItems.length} ta) o'chirishni tasdiqlaysizmi?`}
            {showDeleteAllModal.type === "ended" &&
              `Barcha tugagan tatillarni (${currentItems.length} ta) o'chirishni tasdiqlaysizmi?`}
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={handleDeleteAllInCurrentTab}
            color="red"
            appearance="primary"
          >
            Ha, barchasini o'chirish
          </Button>
          <Button
            onClick={() => setShowDeleteAllModal({ show: false, type: null })}
            appearance="subtle"
          >
            Bekor qilish
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Mark All as Read Modal */}
      <Modal
        open={showClearModal}
        onClose={() => setShowClearModal(false)}
        size="xs"
        backdrop="static"
        className={isDark ? "dark-theme-modal" : ""}
      >
        <Modal.Header>
          <Modal.Title className="font-black flex items-center gap-2">
            <FiInfo className="text-green-500" />
            Barchasini o'qilgan deb belgilash
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className={isDark ? "text-gray-300" : "text-gray-600"}>
            Barcha bildirishnomalarni o'qilgan deb belgilashni tasdiqlaysizmi?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={handleMarkAllAsRead}
            color="green"
            appearance="primary"
          >
            Ha, belgilash
          </Button>
          <Button onClick={() => setShowClearModal(false)} appearance="subtle">
            Bekor qilish
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Notifications;
