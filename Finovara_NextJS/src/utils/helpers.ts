import { COMPLIANCE_CALENDAR } from "./constants";

export const handleAddCalendar = (item: { date: string; task: string; desc: string; type: string }) => {
  const currentYear = new Date().getFullYear();
  const monthMap: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
  const parts = item.date.split(" ");
  const day = parts[0].replace(/\D/g, "").padStart(2, "0");
  const month = monthMap[parts[1]] || "01";
  const dateString = `${currentYear}${month}${day}`;
  const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Finovara//Compliance Calendar//EN\nBEGIN:VEVENT\nUID:${Date.now()}@finovara.com\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z\nDTSTART;VALUE=DATE:${dateString}\nSUMMARY:${item.task} (${item.type})\nDESCRIPTION:${item.desc}\nEND:VEVENT\nEND:VCALENDAR`;
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${item.task.replace(/\s+/g, "_")}_Deadline.ics`; a.click();
  URL.revokeObjectURL(url);
};

export const handleDownloadResource = (title: string) => {
  const filename = `Finovara_${title.replace(/\s+/g, "_")}.html`;
  const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} | Finovara</title></head><body><h1>${title}</h1><p>Finovara Chartered Accountants LLP</p></body></html>`;
  const el = document.createElement("a");
  el.href = URL.createObjectURL(new Blob([htmlContent], { type: "text/html" }));
  el.download = filename; document.body.appendChild(el); el.click(); document.body.removeChild(el);
};
