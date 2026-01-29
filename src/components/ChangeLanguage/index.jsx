import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Modal, Button, RadioGroup, Radio } from "rsuite";
import { changeLanguage } from "../../createSlice/ChangeLanguage";
import { useState } from "react";

const ChangeLanguage = ({ open, setOpen }) => {
  const [lang, setLang] = useState("en");
  const language = useSelector((state) => state.language.value);

  const handleClose = () => {
    setOpen(false);
  };
  function handleSaveLang() {
    dispatch(changeLanguage(lang));
    i18n.changeLanguage(lang);
    setOpen(false);
  }

  const { t, i18n } = useTranslation();
  const theme = useSelector((state) => state.theme.value);
  const dispatch = useDispatch();
  //   change language function
  function handleChangeLang(e) {
    setLang(e);
  }
  return (
    <>
      <Modal open={open} onClose={handleClose}>
        <Modal.Header>
          <Modal.Title>{t("Change language")}</Modal.Title>
        </Modal.Header>
        <Modal.Body color={theme === "light" ? "#343434" : "#cbced4"}>
          <RadioGroup
            name="radio-group"
            defaultValue={language}
            onChange={(e) => handleChangeLang(e)}
          >
            <Radio value="en">English</Radio>
            <Radio value="uz">Uzbek</Radio>
          </RadioGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={handleClose} appearance="subtle">
            {t("Cancel")}
          </Button>
          <Button onClick={handleSaveLang} appearance="primary">
            {t("Save")}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};
export default ChangeLanguage;
