import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase";

function Logout() {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("Foydalanuvchi muvaffaqiyatli chiqdi");
      // Bu yerda foydalanuvchini login sahifasiga yo'naltirish mumkin
    } catch (error) {
      console.error("Chiqishda xatolik yuz berdi:", error.message);
    }
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: "10px 20px",
        backgroundColor: "#f44336",
        color: "white",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
      }}
    >
      Hisobdan chiqish
    </button>
  );
}

export default Logout;
