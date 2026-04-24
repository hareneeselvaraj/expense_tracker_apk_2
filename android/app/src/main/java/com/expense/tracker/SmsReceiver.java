package com.expense.tracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

/**
 * BroadcastReceiver for incoming SMS messages.
 * Filters for bank SMS and forwards to SmsReaderPlugin.
 */
public class SmsReceiver extends BroadcastReceiver {

    private static final String TAG = "SmsReceiver";
    private static final String SMS_RECEIVED = "android.provider.Telephony.SMS_RECEIVED";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !SMS_RECEIVED.equals(intent.getAction())) return;

        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        Object[] pdus = (Object[]) bundle.get("pdus");
        if (pdus == null) return;

        String format = bundle.getString("format");

        for (Object pdu : pdus) {
            SmsMessage message;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                message = SmsMessage.createFromPdu((byte[]) pdu, format);
            } else {
                message = SmsMessage.createFromPdu((byte[]) pdu);
            }

            if (message == null) continue;

            String sender = message.getOriginatingAddress();
            String body = message.getMessageBody();
            long timestamp = message.getTimestampMillis();

            Log.d(TAG, "SMS from: " + sender);

            // Only forward bank SMS to the plugin
            if (isBankSender(sender)) {
                SmsReaderPlugin plugin = SmsReaderPlugin.getInstance();
                if (plugin != null) {
                    plugin.onSmsReceived(sender, body, timestamp);
                }
            }
        }
    }

    private boolean isBankSender(String address) {
        if (address == null) return false;
        String upper = address.toUpperCase();
        if (upper.matches("^[A-Z]{2}-[A-Z]{4,}.*")) return true;
        String[] banks = {"HDFC", "SBI", "ICICI", "AXIS", "KOTAK", "BOB", "PNB", "CANARA", "IDBI", "INDUSIND", "FEDERAL", "BANDHAN", "RBL", "IDFC"};
        for (String bank : banks) {
            if (upper.contains(bank)) return true;
        }
        return false;
    }
}
