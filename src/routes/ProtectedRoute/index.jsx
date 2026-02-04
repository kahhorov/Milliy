import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  // localStorage-dan ma'lumotni o'qiymiz
  const authData = localStorage.getItem("userAuth");

  if (!authData) {
    // Agar ma'lumot yo'q bo'lsa, loginga qaytaradi
    return <Navigate to="/login" replace />;
  }

  // Agar ma'lumot bo'lsa, asosiy sahifani ko'rsatadi
  return children;
}

export default ProtectedRoute;
