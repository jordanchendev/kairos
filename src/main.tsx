import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import "./index.css";
import { syncRuntimeClients } from "@/lib/api/runtime";
import { AppProviders } from "@/providers/app-providers";
import { router } from "@/router";

document.documentElement.classList.add("dark");
syncRuntimeClients();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </React.StrictMode>,
);
