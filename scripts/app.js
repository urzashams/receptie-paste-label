import {
  connectPrinterFromButton,
  printLabel,
  reconnectAuthorizedPrinter,
} from "./printer.js";

const button = document.getElementById("paste-button");
const status = document.getElementById("status");
const setStatus = (message) => {
  status.textContent = message;
};

button.disabled = true;
await reconnectAuthorizedPrinter(setStatus);
button.disabled = false;

button.addEventListener("click", async () => {
  if (button.disabled) return;

  if (!isSecureContext || !navigator.clipboard?.readText) {
    setStatus("Clipboardul este disponibil numai pe o pagină HTTPS într-un browser compatibil.");
    return;
  }
  if (!navigator.bluetooth) {
    setStatus("Deschide pagina în Chrome pe un dispozitiv cu Bluetooth.");
    return;
  }

  button.disabled = true;
  setStatus("Se citește clipboardul și se conectează imprimanta...");

  let clipboardPromise;
  let printerPromise;
  try {
    // Start both permission-gated operations in the original tap gesture.
    clipboardPromise = navigator.clipboard.readText();
    printerPromise = connectPrinterFromButton(setStatus);
  } catch (error) {
    setStatus(error.message || "Nu s-a putut porni imprimarea.");
    button.disabled = false;
    return;
  }

  const [clipboardResult, printerResult] = await Promise.allSettled([
    clipboardPromise,
    printerPromise,
  ]);

  if (clipboardResult.status === "rejected") {
    setStatus("Nu s-a putut citi clipboardul. Apasă PASTE și aprobă accesul dacă browserul întreabă.");
    button.disabled = false;
    return;
  }
  if (printerResult.status === "rejected") {
    setStatus(printerResult.reason?.message || "Nu s-a putut conecta imprimanta.");
    button.disabled = false;
    return;
  }

  const code = clipboardResult.value.trim();
  if (!code) {
    setStatus("Clipboardul nu conține niciun cod text.");
    button.disabled = false;
    return;
  }

  try {
    await printLabel(code, setStatus);
    setStatus("Eticheta a fost trimisă imprimantei.");
  } catch (error) {
    setStatus(error.message || "Imprimarea a eșuat.");
  } finally {
    button.disabled = false;
  }
});
