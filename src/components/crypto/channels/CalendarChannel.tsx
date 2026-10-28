import { useEffect, useRef } from "react";

const CalendarChannel = () => {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = box.current;
    if (!host) return;
    const width = Math.max(320, Math.min(host.clientWidth, 1200));
    const script = document.createElement("script");
    script.async = true;
    script.type = "text/javascript";
    script.setAttribute("data-type", "calendar-widget");
    script.src = "https://www.tradays.com/c/js/widgets/calendar/widget.js?v=15";
    script.text = JSON.stringify({ width, height: 560, mode: "2", fw: "html", lang: "ru", theme: 1 });
    host.appendChild(script);
    return () => {
      host.innerHTML = "";
    };
  }, []);

  return (
    <div className="space-y-3 animate-fade-in">
      <section className="bg-card border border-border rounded-xl p-3 sm:p-4">
        <div ref={box} className="w-full min-h-[560px] [&>div]:max-w-full [&_iframe]:max-w-full">
          <div id="economicCalendarWidget" />
        </div>
        <div className="text-[10px] text-muted-foreground mt-2">
          <a
            href="https://www.metatrader.com/?utm_source=calendar.widget&utm_medium=link&utm_term=economic.calendar&utm_content=visit.mql5.calendar&utm_campaign=202.calendar.widget"
            rel="noopener nofollow"
            target="_blank"
            className="hover:text-white"
          >
            MetaTrader World Markets
          </a>
        </div>
      </section>
    </div>
  );
};

export default CalendarChannel;
