# Add project specific ProGuard rules here.
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ── Capacitor ─────────────────────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep class com.expense.tracker.** { *; }
-dontwarn com.getcapacitor.**

# ── AndroidX & WebView ────────────────────────────────────────────────
-keep class androidx.** { *; }
-dontwarn androidx.**

# ── Keep WebView JavaScript interface ─────────────────────────────────
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── Keep native methods ───────────────────────────────────────────────
-keepclassmembers class * {
    native <methods>;
}

# ── Remove debug logs in release ──────────────────────────────────────
-assumenosideeffects class android.util.Log {
    public static int d(...);
    public static int v(...);
    public static int i(...);
}

# Hide source file names in stack traces
-renamesourcefileattribute SourceFile
-keepattributes SourceFile,LineNumberTable
