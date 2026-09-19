import { useEffect, useState } from "react";

export function usePhoneLandscape() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const read = () => {
      const landscape = window.matchMedia("(orientation: landscape)").matches;
      const short = window.innerHeight <= 640;
      const touch = window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 960;
      setOn(landscape && short && (touch || window.innerWidth <= 1100));
    };
    read();
    const mq = window.matchMedia("(orientation: landscape)");
    mq.addEventListener("change", read);
    window.addEventListener("resize", read);
    window.addEventListener("orientationchange", read);
    return () => {
      mq.removeEventListener("change", read);
      window.removeEventListener("resize", read);
      window.removeEventListener("orientationchange", read);
    };
  }, []);
  return on;
}
