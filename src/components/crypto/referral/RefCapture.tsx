import { useEffect } from "react";
import { saveRefCode } from "@/lib/referral";

const RefCapture = () => {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("ref");
      if (code) saveRefCode(code);
    } catch {
      return;
    }
  }, []);
  return null;
};

export default RefCapture;
