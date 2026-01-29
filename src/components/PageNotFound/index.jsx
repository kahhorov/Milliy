import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "rsuite";
import { IoIosArrowRoundBack } from "react-icons/io";

function PageNotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-5 justify-center items-center w-full h-screen">
      <img src="/PageNot.png" alt="Page not found" />
      <h1 className="text-red-500 text-3xl">{t("Page Not Found")}</h1>
      <Button
        appearance="ghost"
        onClick={() => navigate("/")}
        style={{ display: "flex", gap: "3px", fontSize: "13px" }}
      >
        <IoIosArrowRoundBack size={20} /> {t("Back to Dashboard")}
      </Button>
    </div>
  );
}

export default PageNotFound;
