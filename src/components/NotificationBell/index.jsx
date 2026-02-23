import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FiBell } from "react-icons/fi";
import { Whisper, Tooltip, Button } from "rsuite";
import { setNotifications } from "../../createSlice/notificationSlice";

const NotificationBell = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { unreadCount } = useSelector((state) => state.notifications);
  const theme = useSelector((state) => state.theme.value);
  const [animate, setAnimate] = useState(false);

  // Load notifications from localStorage
  useEffect(() => {
    const loadNotifications = () => {
      try {
        const stored = JSON.parse(
          localStorage.getItem("notifications") || "[]",
        );
        dispatch(setNotifications(stored));
      } catch (error) {
        console.error("Error loading notifications:", error);
      }
    };

    loadNotifications();

    // Check every 5 seconds for new notifications
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Animate when new notification arrives
  useEffect(() => {
    if (unreadCount > 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  const handleClick = () => {
    navigate("/notifications");
  };

  const badgeContent = unreadCount > 99 ? "99+" : unreadCount;
  const isDark = theme === "dark";

  if (unreadCount === 0) {
    return (
      <Whisper
        trigger="hover"
        placement="bottom"
        speaker={<Tooltip>Bildirishnomalar</Tooltip>}
      >
        <button
          appearance="subtle"
          onClick={handleClick}
          className={`rounded-full w-10 h-10 transition-all flex justify-center items-center ${
            isDark
              ? "text-gray-400 hover:text-white hover:bg-white/10"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <FiBell size={22} />
        </button>
      </Whisper>
    );
  }

  return (
    <Whisper
      trigger="hover"
      placement="bottom"
      speaker={<Tooltip>{unreadCount} ta yangi bildirishnoma</Tooltip>}
    >
      <div className="relative inline-block">
        <button
          onClick={handleClick}
          className={`rounded-full w-10 h-10 relative transition-all flex items-center justify-center ${
            isDark
              ? "text-gray-400 hover:text-white hover:bg-white/10"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          } ${animate ? "animate-shake" : ""}`}
        >
          <FiBell size={22} />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold min-w-5 h-5 flex items-center justify-center rounded-full px-1 animate-pulse">
            {badgeContent}
          </span>
        </button>
      </div>
    </Whisper>
  );
};

export default NotificationBell;
