package com.expense.tracker;

import android.Manifest;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONObject;

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

    private static final String TAG = "SmsReaderPlugin";
    private static SmsReaderPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static SmsReaderPlugin getInstance() {
        return instance;
    }

    /**
     * Request SMS permissions
     */
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

    /**
     * Start listening for incoming SMS (registers the broadcast receiver)
     */
    @PluginMethod
    public void startListening(PluginCall call) {
        // The SmsReceiver is registered in AndroidManifest.xml
        // It will fire events to this plugin
        JSObject ret = new JSObject();
        ret.put("listening", true);
        call.resolve(ret);
    }

    /**
     * Read recent SMS messages from inbox
     */
    @PluginMethod
    public void readRecentSms(PluginCall call) {
        int limit = call.getInt("limit", 50);

        if (getPermissionState("sms") != PermissionState.GRANTED) {
            call.reject("SMS permission not granted");
            return;
        }

        try {
            JSONArray messages = new JSONArray();
            Uri uri = Uri.parse("content://sms/inbox");
            String[] projection = {"address", "body", "date"};
            Cursor cursor = getContext().getContentResolver().query(
                uri, projection, null, null, "date DESC"
            );

            if (cursor != null) {
                int count = 0;
                while (cursor.moveToNext() && count < limit) {
                    String address = cursor.getString(cursor.getColumnIndexOrThrow("address"));
                    String body = cursor.getString(cursor.getColumnIndexOrThrow("body"));
                    long date = cursor.getLong(cursor.getColumnIndexOrThrow("date"));

                    // Only process SMS from bank-like senders (XX-XXXXX format)
                    if (address != null && isBankSender(address)) {
                        JSONObject msg = new JSONObject();
                        msg.put("sender", address);
                        msg.put("body", body);
                        msg.put("timestamp", date);
                        messages.put(msg);
                        count++;
                    }
                }
                cursor.close();
            }

            JSObject ret = new JSObject();
            ret.put("messages", messages.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to read SMS: " + e.getMessage());
        }
    }

    /**
     * Check if a sender address looks like a bank sender
     */
    private boolean isBankSender(String address) {
        if (address == null) return false;
        String upper = address.toUpperCase();
        // Indian bank SMS senders: XX-HDFCBK, AD-ICICIT, VM-SBIINB, etc.
        if (upper.matches("^[A-Z]{2}-[A-Z]{4,}.*")) return true;
        // Also match short codes containing bank names
        String[] banks = {"HDFC", "SBI", "ICICI", "AXIS", "KOTAK", "BOB", "PNB", "CANARA", "IDBI", "INDUSIND", "FEDERAL", "BANDHAN", "RBL", "IDFC"};
        for (String bank : banks) {
            if (upper.contains(bank)) return true;
        }
        return false;
    }

    /**
     * Called by SmsReceiver when a new SMS arrives
     */
    public void onSmsReceived(String sender, String body, long timestamp) {
        JSObject data = new JSObject();
        data.put("sender", sender);
        data.put("body", body);
        data.put("timestamp", timestamp);
        notifyListeners("smsReceived", data);
    }
}
