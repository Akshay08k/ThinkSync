import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { DarkModeProvider } from "./contexts/DarkModeContext.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DarkModeProvider>
      <AuthProvider>
        <h1 className="text-3xl font-bold underline">
          Hello Who Are Visiting This Site From That Spam Mail
          Please Avoid Clicking On Any Link In That Mail Because 
          It was my resendAPI key which got hacked from somewhere
          and mails were sended from that account 
          Please avoid those mails</h1> 
      </AuthProvider>
    </DarkModeProvider>
  </StrictMode>
);
