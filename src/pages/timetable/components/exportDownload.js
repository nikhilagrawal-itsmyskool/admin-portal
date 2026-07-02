import { timetableService } from "../../../services/timetableService";

// Fetch a run's rendered export (xlsx/pdf) and trigger a browser download.
// Mirrors the base64 -> Blob pattern the app uses for fine evidence. Throws on
// failure (e.g. the file isn't rendered yet) so the caller can surface the message.
export async function downloadRunExport(runId, format) {
  const file = await timetableService.exportRun(runId, format);
  const bytes = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
