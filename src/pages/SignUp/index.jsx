import { useEffect, useRef, useState } from "react";
import { Input, Button } from "rsuite";
import { Link, useNavigate } from "react-router-dom";
import { MdEmail, MdLock, MdPerson } from "react-icons/md";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import { FcGoogle } from "react-icons/fc";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const theme = useSelector((state) => state.theme.value);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const intervalRef = useRef(null);

  // 🔁 Email verification checker
  const startEmailVerificationCheck = (user) => {
    intervalRef.current = setInterval(async () => {
      await user.reload();

      if (user.emailVerified) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        toast.success(t("Email verified successfully"));
        navigate("/");
      }
    }, 3000);
  };

  // 🔐 Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    });

    return () => {
      unsubscribe();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [t, navigate]);

  // Form submit funksiyasi
  const handleSubmit = (e) => {
    e.preventDefault(); // Sahifa yangilanib ketishini oldini oladi
    handleRegister();
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !repeatPassword) {
      setError(t("Please fill all fields"));
      return;
    }

    if (password !== repeatPassword) {
      setError(t("Passwords do not match"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(res.user, {
        displayName: name,
      });

      await sendEmailVerification(res.user);

      toast.warning(t("Verification link has been sent to your email"), {
        autoClose: 4000,
      });

      startEmailVerificationCheck(res.user);
    } catch (e) {
      setError(t("Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  // 🌐 Google orqali ro'yxatdan o'tish
  const handleGoogleSignUp = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        toast.success(t("Successfully signed up with Google"));
        navigate("/");
      }
    } catch (error) {
      toast.error(t("Google registration failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className={`w-full max-w-md rounded-2xl shadow-lg p-8
        ${theme === "dark" ? "border border-gray-600 bg-[#1a1d24]" : "border border-gray-300 bg-white"}`}
      >
        {/* Header */}
        <div className="mb-8">
          <h1
            className={`text-2xl font-semibold
            ${theme === "light" ? "text-gray-800" : "text-gray-200"}`}
          >
            {t("Create account")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("Create a new account")}
          </p>
        </div>

        {/* Form boshlanishi */}
        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="mb-5">
            <label className="text-sm text-gray-600 block mb-1">
              {t("Full name")}
            </label>
            <div className="relative">
              <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10" />
              <Input
                value={name}
                onChange={setName}
                placeholder={t("Enter your name")}
                className="!pl-10 !rounded-xl"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="mb-5">
            <label className="text-sm text-gray-600 block mb-1">
              {t("Email address")}
            </label>
            <div className="relative">
              <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10" />
              <Input
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="admin@gmail.com"
                className="!pl-10 !rounded-xl"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="text-sm text-gray-600 block mb-1">
              {t("Password")}
            </label>
            <div className="relative">
              <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={setPassword}
                placeholder={t("Enter password")}
                className="!pl-10 !pr-10 !rounded-xl"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer z-10"
              >
                {showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
              </button>
            </div>
          </div>

          {/* Repeat Password */}
          <div className="mb-4">
            <label className="text-sm text-gray-600 block mb-1">
              {t("Repeat password")}
            </label>
            <div className="relative">
              <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10" />
              <Input
                type={showPassword ? "text" : "password"}
                value={repeatPassword}
                onChange={setRepeatPassword}
                placeholder={t("Repeat password")}
                className="!pl-10 !pr-10 !rounded-xl"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 mb-4 font-medium">{error}</p>
          )}

          <Button
            type="submit" // Enter bosilganda ishlashi uchun asosiy o'zgarish
            appearance="primary"
            loading={loading}
            block
            className="!rounded-xl !py-2 !text-base shadow-md hover:shadow-lg transition-all"
          >
            {t("Create account")}
          </Button>
        </form>

        {/* --- Google tugmasi --- */}
        <div className="my-4 flex items-center before:content-[''] before:flex-1 before:border-b before:border-gray-300 after:content-[''] after:flex-1 after:border-b after:border-gray-300">
          <span className="px-3 text-gray-400 text-xs uppercase">
            {t("or")}
          </span>
        </div>

        <Button
          type="button"
          appearance="default"
          block
          onClick={handleGoogleSignUp}
          className="!rounded-xl !py-2 !text-base !flex !items-center !justify-center !gap-2 border border-gray-300 hover:bg-gray-50 transition-all"
        >
          <FcGoogle className="text-xl" />
          {t("Continue with Google")}
        </Button>

        <div className="w-full flex justify-center mt-6">
          <Link
            to="/login"
            className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
          >
            {t("Already have an account?")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
