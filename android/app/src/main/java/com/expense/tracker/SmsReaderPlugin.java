package com.expense.tracker;

import android.Manifest;
import android.database.Cursor;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SmsReader",
    permissions = {
        @Permission(
            alias = "sms",
            strings = {
                Manifest.permission.READ_SMS,
                Manifest.permission.RECEIVE_SMS
            }
        )
    }
)
public class SmsReaderPlugin extends Plugin {

    private static SmsReaderPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static SmsReaderPlugin getInstance() {
        return instance;
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        } else {
            requestPermissionForAlias("sms", call, "smsPermCallback");
        }
    }

    @PermissionCallback
    private void smsPermCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("sms") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("listening", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void readRecentSms(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            call.reject("SMS permission not granted");
            return;
        }

        try {
            int limit = call.getInt("limit", 50);
            StringBuilder sb = new StringBuilder("[");
            Uri uri = Uri.parse("content://sms/inbox");
            Cursor cursor = getContext().getContentResolver().query(
                uri, new String[]{"address", "body", "date"}, null, null, "date DESC"
            );

            if (cursor != null) {
                int count = 0;
                boolean first = true;
                while (cursor.moveToNext() && count < limit) {
                    String address = cursor.getString(0);
                    String body = cursor.getString(1);
                    long date = cursor.getLong(2);

                    if (address != null && isBankSender(address)) {
                        if (!first) sb.append(",");
                        sb.append("{\"sender\":\"").append(escapeJson(address))
                          .append("\",\"body\":\"").append(escapeJson(body))
                          .append("\",\"timestamp\":").append(date).append("}");
                        first = false;
                        count++;
                    }
                }
                cursor.close();
            }
            sb.append("]");

            JSObject ret = new JSObject();
            ret.put("messages", sb.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to read SMS: " + e.getMessage());
        }
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }

    private boolean isBankSender(String address) {
        if (address == null) return false;
        String upper = address.toUpperCase();
        if (upper.matches("^[A-Z]{2}-[A-Z]{4,}.*")) return true;
        String[] banks = {"HDFC", "SBI", "ICICI", "AXIS", "KOTAK", "BOB", "PNB", "CANARA"};
        for (String bank : banks) {
            if (upper.contains(bank)) return true;
        }
        return false;
    }

    public void onSmsReceived(String sender, String body, long timestamp) {
        JSObject data = new JSObject();
        data.put("sender", sender);
        data.put("body", body);
        data.put("timestamp", timestamp);
        notifyListeners("smsReceived", data);
    }
}
