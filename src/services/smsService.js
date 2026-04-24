/**
 * SMS Service — Bridge between native SMS receiver and the web app
 * 
 * On native (Capacitor): listens for SMS events from the native plugin
 * On web: provides a manual SMS paste/import fallback
 */

import { Capacitor } from "@capacitor/core";
import { parseBankSms, isBankSms } from "./smsParser.js";

let _onNewTransaction = null;
let _categories = [];
let _accounts = [];
let _initialized = false;

/**
 * Initialize the SMS service
 * @param {Function} onNewTransaction - Callback: (transaction) => void
 * @param {Array} categories - App categories
 * @param {Array} accounts - App accounts
 */
export function initSmsService(onNewTransaction, categories, accounts) {
  _onNewTransaction = onNewTransaction;
  _categories = categories;
  _accounts = accounts;

  if (_initialized) return;
  _initialized = true;

  if (Capacitor.isNativePlatform()) {
    initNativeSmsListener();
  }
}

/**
 * Update categories/accounts reference (call when they change)
 */
export function updateSmsServiceData(categories, accounts) {
  _categories = categories;
  _accounts = accounts;
}

/**
 * Listen for SMS events from the native Capacitor plugin
 */
async function initNativeSmsListener() {
  try {
    const { registerPlugin } = await import("@capacitor/core");
    const SmsReader = registerPlugin("SmsReader");

    // Request SMS permission
    const permResult = await SmsReader.requestPermission();
    if (!permResult.granted) {
      console.warn("SMS permission not granted");
      return;
    }

    // Start listening for incoming SMS
    await SmsReader.startListening();

    // Listen for SMS received events
    SmsReader.addListener("smsReceived", (data) => {
      handleIncomingSms(data.sender, data.body, data.timestamp);
    });

    console.log("[SmsService] Native SMS listener initialized");
  } catch (err) {
    console.warn("[SmsService] Failed to initialize native SMS listener:", err);
  }
}

/**
 * Handle an incoming SMS — parse and create transaction
 */
function handleIncomingSms(sender, body, timestamp) {
  if (!isBankSms(sender)) return;

  const tx = parseBankSms(body, sender, _categories, _accounts);
  if (!tx && _onNewTransaction) {
    return; // Not a financial SMS
  }
  if (tx && _onNewTransaction) {
    _onNewTransaction(tx);
  }
}

/**
 * Manual SMS text import — user pastes SMS messages
 * @param {string} text - Raw SMS text (can be multiple, separated by newlines)
 * @returns {Array} Array of parsed transactions
 */
export function parseManualSmsInput(text) {
  if (!text || !text.trim()) return [];

  // Split by double newlines (multiple SMS) or treat as single
  const messages = text.split(/\n{2,}/).filter(Boolean);
  const results = [];

  for (const body of messages) {
    const tx = parseBankSms(body.trim(), "MANUAL", _categories, _accounts);
    if (tx) results.push(tx);
  }

  return results;
}

/**
 * Check if the app is running on a native platform
 */
export function isNativePlatform() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}
