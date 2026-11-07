package vn.local.mbnotify;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.app.Notification;
import org.json.JSONObject;

public class MbListener extends NotificationListenerService {
    static volatile MbListener instance;
    static void pause(){MbListener service=instance;if(service!=null){service.handler.removeCallbacks(service.retry);if(Relay.listenerConnected)service.requestUnbind();}Relay.listenerConnected=false;}
    @Override public void onCreate(){super.onCreate();instance=this;}
    final android.os.Handler handler=new android.os.Handler(android.os.Looper.getMainLooper());
    final Runnable retry=new Runnable(){public void run(){if(!Relay.enabled(MbListener.this)){pause();return;}Relay.flush(MbListener.this);handler.postDelayed(this,5000);}};
    @Override public void onListenerConnected(){Relay.listenerConnected=true;handler.removeCallbacks(retry);if(!Relay.enabled(this)){pause();return;}Relay.reconnect(this);handler.post(retry);}
    @Override public void onListenerDisconnected(){Relay.listenerConnected=false;handler.removeCallbacks(retry);if(Relay.enabled(this))requestRebind(new android.content.ComponentName(this,MbListener.class));}
    @Override public void onDestroy(){if(instance==this)instance=null;Relay.listenerConnected=false;handler.removeCallbacks(retry);super.onDestroy();}
    @Override public void onNotificationPosted(StatusBarNotification sbn){
        if(!Relay.accepts(this,sbn.getPostTime()))return;
        if(!"com.mbmobile".equals(sbn.getPackageName()))return;
        Notification n=sbn.getNotification();if((n.flags&Notification.FLAG_GROUP_SUMMARY)!=0)return;
        String title=String.valueOf(n.extras.getCharSequence(Notification.EXTRA_TITLE,"MB Bank"));
        CharSequence big=n.extras.getCharSequence(Notification.EXTRA_BIG_TEXT);CharSequence small=n.extras.getCharSequence(Notification.EXTRA_TEXT);
        String text=big!=null&&!big.toString().trim().isEmpty()?big.toString():(small==null?"":small.toString());
        if(text.trim().isEmpty()){CharSequence[] lines=n.extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);if(lines!=null)text=android.text.TextUtils.join("\n",lines);}
        if(text.trim().isEmpty())return;
        // Never forward messages that look like authentication codes.
        if((title+" "+text).toLowerCase(java.util.Locale.ROOT).matches("(?s).*(\\botp\\b|mã xác thực|ma xac thuc|verification code|mã đăng nhập|mã bảo mật).*"))return;
        try{JSONObject event=new JSONObject();String raw=sbn.getKey()+"|"+sbn.getPostTime()+"|"+title+"|"+text;byte[] hash=java.security.MessageDigest.getInstance("SHA-256").digest(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8));StringBuilder id=new StringBuilder();for(byte b:hash)id.append(String.format("%02x",b));event.put("id",id.toString());event.put("packageName",sbn.getPackageName());event.put("title",title);event.put("text",text);event.put("postedAt",sbn.getPostTime());Relay.enqueue(this,event);}catch(Exception ignored){}
    }
}
