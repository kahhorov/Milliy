import { useState, useEffect } from "react";
import { doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

export const useUzbekTime = () => {
  const [uzbekTime, setUzbekTime] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUzbekTime = async () => {
      try {
        // Firebase server vaqtini olish uchun maxsus document
        const serverTimeRef = doc(db, "metadata", "serverTime");

        // Server timestamp yaratish
        const timestamp = serverTimestamp();

        // Hozirgi vaqtni olish
        const now = new Date();

        // O'zbekiston vaqti (UTC+5)
        const uzbekOffset = 5 * 60 * 60 * 1000;
        const uzbekDate = new Date(now.getTime() + uzbekOffset);

        setUzbekTime(uzbekDate);
      } catch (error) {
        console.error("Error getting time:", error);
        // Xatolik bo'lsa lokal vaqt +5
        const now = new Date();
        const uzbekOffset = 5 * 60 * 60 * 1000;
        const uzbekDate = new Date(now.getTime() + uzbekOffset);
        setUzbekTime(uzbekDate);
      } finally {
        setLoading(false);
      }
    };

    fetchUzbekTime();

    // Har daqiqada yangilash
    const interval = setInterval(fetchUzbekTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatUzbekDate = (date = uzbekTime) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatUzbekDateReadable = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const day = date.getDate();
    const months = [
      "Yanvar",
      "Fevral",
      "Mart",
      "Aprel",
      "May",
      "Iyun",
      "Iyul",
      "Avgust",
      "Sentabr",
      "Oktabr",
      "Noyabr",
      "Dekabr",
    ];
    const month = months[date.getMonth()];
    return `${day}-${month} ${year}`;
  };

  return {
    uzbekTime,
    loading,
    todayStr: uzbekTime ? formatUzbekDate(uzbekTime) : "",
    formatUzbekDate,
    formatUzbekDateReadable,
  };
};
