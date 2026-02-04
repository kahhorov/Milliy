import { useState } from "react";
import { Input, Button } from "rsuite";
import { useNavigate } from "react-router-dom";
import { MdPerson, MdLock } from "react-icons/md";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase"; // Firebase config faylingiz yo'li
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

function Login() {
  const [inputLogin, setInputLogin] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const theme = useSelector((state) => state.theme.value);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Rasmdagi auth/admin hujjatini olamiz
      const docRef = doc(db, "auth", "admin");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const { login, password } = docSnap.data();

        // Kiritilgan ma'lumotni bazadagi bilan solishtirish
        if (inputLogin === login && inputPassword === password) {
          // Muvaffaqiyatli: localStorage-ga login va parolni saqlaymiz
          const authData = { login: inputLogin, password: inputPassword };
          localStorage.setItem("userAuth", JSON.stringify(authData));

          toast.success(t("Xush kelibsiz!"));
          navigate("/");
        } else {
          setError(t("Login yoki parol noto'g'ri!"));
          toast.error(t("Login yoki parol noto'g'ri!"));
        }
      } else {
        setError(t("Bazada admin ma'lumotlari topilmadi"));
      }
    } catch (e) {
      console.error(e);
      setError(t("Tizimda xatolik yuz berdi"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center ${theme === "dark" ? "bg-[#090E1E]" : "bg-[#F6F7FB]"}`}
    >
      <div
        className={`w-full max-w-md rounded-2xl shadow-lg p-8 ${theme === "dark" ? "border border-gray-600 bg-[#1a1d24]" : "border border-gray-300 bg-white"}`}
      >
        <div className="mb-8 text-center">
          <h1
            className={`text-2xl font-semibold ${theme === "light" ? "text-gray-800" : "text-gray-200"}`}
          >
            {t("Tizimga kirish")}
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="text-sm text-gray-600 block mb-1">
              {t("Login")}
            </label>
            <div className="relative">
              <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10" />
              <Input
                value={inputLogin}
                onChange={setInputLogin}
                placeholder="admin123"
                className="!pl-10 !rounded-xl"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="text-sm text-gray-600 block mb-1">
              {t("Parol")}
            </label>
            <div className="relative">
              <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10" />
              <Input
                type={showPassword ? "text" : "password"}
                value={inputPassword}
                onChange={setInputPassword}
                placeholder="••••••••"
                className="!pl-10 !pr-10 !rounded-xl"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer z-10"
              >
                {showPassword ? (
                  <HiOutlineEyeOff size={18} />
                ) : (
                  <HiOutlineEye size={18} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 mb-4 font-medium">{error}</p>
          )}

          <Button
            type="submit"
            appearance="primary"
            loading={loading}
            block
            className="!rounded-xl !py-2 !text-base shadow-md"
          >
            {t("Kirish")}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Login;
