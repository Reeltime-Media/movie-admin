"use client";

import { ToastContainer } from "react-toastify";
import { useTheme } from "./ThemeProvider";

export function ToastProvider() {
  const { theme } = useTheme();

  return (
    <ToastContainer
      position="top-right"
      autoClose={3500}
      hideProgressBar
      newestOnTop
      closeOnClick
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={theme === "light" ? "light" : "dark"}
    />
  );
}
