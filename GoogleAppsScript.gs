// ==========================================
// FULL GOOGLE APPS SCRIPT DENGAN GOOGLE SHEET (VERSI 2.0 - FIX BANDWIDTH LIMIT)
// Sila copy semua kod di bawah ini dan paste dalam script.google.com
// ==========================================

const TELEGRAM_BOT_TOKEN = "8646017951:AAHqZmfhbAS-6VB3JM57RDfQW8jkFK22wjo";
const TELEGRAM_CHAT_ID = "-1003934378851"; // Pastikan ini betul

// ==========================================
// 1. FUNGSI SETUP (BINA TAB AUTOMATIK)
// ==========================================
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log("Ralat: Sila pastikan script ini disambungkan ke Google Sheet (Extensions > Apps Script)");
    return;
  }
  
  let apiSheet = ss.getSheetByName("API_KEY");
  if (!apiSheet) {
    apiSheet = ss.insertSheet("API_KEY");
    apiSheet.getRange("A1:B1").setValues([["API CONFIGURATION", "VALUE"]]);
    apiSheet.getRange("A2:B2").setValues([["GEMINI_API_KEY", "AIzaSyBFRDquGFJZhsZPq4x_aykiqLAmlKAzhBc"]]);
    apiSheet.getRange("A1:B1").setBackground("#000080").setFontColor("white").setFontWeight("bold");
    apiSheet.getRange("A2:A2").setBackground("#E0E0E0").setFontWeight("bold");
    apiSheet.setRowHeights(1, 2, 30);
    apiSheet.setColumnWidths(1, 1, 200);
    apiSheet.setColumnWidths(2, 1, 400);
    apiSheet.setFrozenRows(1);
  }
  
  let historySheet = ss.getSheetByName("HISTORY_SUMMARY");
  if (!historySheet) {
    historySheet = ss.insertSheet("HISTORY_SUMMARY");
    const headers = [["Tarikh & Masa", "Pesanan Leader", "Lampiran Fail", "Ringkasan AI", "Status Telegram"]];
    historySheet.getRange("A1:E1").setValues(headers);
    historySheet.getRange("A1:E1").setBackground("#000080").setFontColor("white").setFontWeight("bold");
    historySheet.setRowHeights(1, 1, 35);
    historySheet.setColumnWidths(1, 1, 150); 
    historySheet.setColumnWidths(2, 1, 250); 
    historySheet.setColumnWidths(3, 1, 200); 
    historySheet.setColumnWidths(4, 1, 450); 
    historySheet.setColumnWidths(5, 1, 150); 
    historySheet.setFrozenRows(1);
  }
  
  Logger.log("Setup Selesai!");
}

// ==========================================
// 2. FUNGSI DAPATKAN API KEY DARI SHEET
// ==========================================
function getApiKey() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("API_KEY");
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === "GEMINI_API_KEY" && data[i][1] != "") {
          return data[i][1];
        }
      }
    }
  } catch (e) {}
  return "AIzaSyBFRDquGFJZhsZPq4x_aykiqLAmlKAzhBc";
}

// ==========================================
// 3. FUNGSI SIMPAN KE HISTORY SUMMARY
// ==========================================
function saveHistory(pesanan, lampiran, aiSummary, telegramStatus) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("HISTORY_SUMMARY");
    if (sheet) {
      const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
      sheet.appendRow([timestamp, pesanan, lampiran, aiSummary, telegramStatus]);
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow, 1, 1, 5).setVerticalAlignment("top").setWrap(true);
      if (lastRow % 2 === 0) sheet.getRange(lastRow, 1, 1, 5).setBackground("#F3F3F3");
    }
  } catch (e) {
    Logger.log("Gagal simpan history: " + e.toString());
  }
}

// ==========================================
// 4. FUNGSI UTAMA (WEB HOOK UNTUK FRONTEND)
// ==========================================
function doPost(e) {
  try {
    // Kita elak masalah "Quota Bandwidth Exceeded" dengan hanya menggunakan Google Sheet sebagai Database & Config.
    // Pemprosesan AI & Telegram berlaku di Server Website (Backend).
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    // A. Request dari Server untuk dapatkan API Key
    if (action === "get_config") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        api_key: getApiKey(),
        tele_token: TELEGRAM_BOT_TOKEN,
        tele_chat_id: TELEGRAM_CHAT_ID
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // B. Request dari Server untuk simpan rekod ke Sheet History
    if (action === "save_history") {
      saveHistory(body.pesanan, body.statusFail, body.aiSummary, body.teleStatus);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Rekod berjaya disimpan di Google Sheet!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Action tidak sah."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Gagal: " + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// =========================================================
// CARA PENGGUNAAN APPSCRIPT INI (UNTUK COPY DAN PASTE)
// =========================================================
// 1. Pergi ke *Extensions > Apps Script*.
// 2. Padam kod lama, *Copy & Paste* semua kod ini.
// 3. Wajib: Klik *Deploy > Manage deployments*, edit (klik ikon pensel), tukar *Version* kepada "New version" dan klik *Deploy*.
// 4. Selesai! Tidak perlu tukar link web app di website.
