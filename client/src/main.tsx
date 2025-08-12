import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Production-ready error handling
if (typeof window !== 'undefined') {
  // Global error boundary for unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // In production, you might want to send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Add your error tracking service here (e.g., Sentry)
    }
  });
  
  // Global error handler
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (process.env.NODE_ENV === 'production') {
      // Add your error tracking service here
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
