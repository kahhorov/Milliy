import "rsuite/dist/rsuite-no-reset.css";
import "./I18n/index";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
// Supports weights 300-700
import "@fontsource-variable/space-grotesk";
import { Provider } from "react-redux";
import { store } from "./store/store.js";
import { ToastContainer } from "react-toastify";
createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <ToastContainer position="top-right" />
    <App />
  </Provider>
);
