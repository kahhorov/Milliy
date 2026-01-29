import { useState } from "react";
import { Input, Button } from "rsuite";
import { Link, useNavigate } from "react-router-dom";
import { MdEmail, MdLock } from "react-icons/md";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const theme = useSelector((state) => state.theme.value);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success(t("You have successfully logged in"));
      navigate("/");
    } catch (e) {
      setError(t("Incorrect email or password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className={`w-full max-w-md  ${theme === "dark" ? "border border-gray-600" : "border border-gray-300"} rounded-2xl shadow-lg p-8`}
      >
        {/* Header */}
        <div className="mb-8">
          <h1
            className={`${theme === "light" ? "text-gray-800" : "text-gray-400"} text-2xl font-semibold`}
          >
            {t("Login")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("Log in to your account")}
          </p>
        </div>

        {/* Email */}
        <div className="mb-5">
          <label className="text-sm text-gray-600 block mb-1">
            {t("Email address")}
          </label>
          <div className="relative">
            <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <Input
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="admin@gmail.com"
              className="!pl-10 !rounded-xl"
            />
          </div>
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="text-sm text-gray-600 block mb-1">
            {t("Password")}
          </label>
          <div className="relative">
            <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              placeholder={t("Enter your password")}
              className="!pl-10 !pr-10 !rounded-xl"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
            >
              {showPassword ? (
                <HiOutlineEyeOff size={18} />
              ) : (
                <HiOutlineEye size={18} />
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        {/* Button */}
        <Button
          appearance="primary"
          loading={loading}
          block
          onClick={handleLogin}
          className="!rounded-xl !py-2 !text-base"
        >
          {t("Login")}
        </Button>

        {/* Footer */}
        <div className="w-full flex justify-center">
          <Link
            to={"/sign-up"}
            className="text-xs text-blue-500/70 text-center mt-6 flex"
          >
            {t("Do you have an account?")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
