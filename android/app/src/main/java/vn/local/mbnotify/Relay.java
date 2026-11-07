package vn.local.mbnotify;
import android.content.Context;
import android.content.SharedPreferences;
import org.json.*;
import java.net.*;
import java.util.concurrent.Executors;

public class Relay {
    static final java.util.concurrent.ExecutorService worker=Executors.newSingleThreadExecutor();
    static volatile boolean listenerConnected=false;
    static long nextAttempt=0,lastHeartbeat=0;
    static int failures=0;
    static final Object gate=new Object();
    static volatile long generation=0;
    static volatile HttpURLConnection activeConnection;
    static SharedPreferences prefs(Context c){return c.getSharedPreferences("mbnotify",Context.MODE_PRIVATE);}
    static boolean enabled(Context c){return prefs(c).getBoolean("enabled",true);}
    static boolean accepts(Context c,long postedAt){return enabled(c)&&postedAt>=prefs(c).getLong("enabledSince",0);}
    static boolean current(Context c,long epoch){return enabled(c)&&generation==epoch;}
    static void setEnabled(Context c,boolean value){
        HttpURLConnection cancel;
        synchronized(gate){generation++;cancel=activeConnection;
            SharedPreferences.Editor edit=prefs(c).edit().putBoolean("enabled",value);
            if(value)edit.putLong("enabledSince",System.currentTimeMillis()).putString("status","Đang bật và kết nối lại…");
            else edit.putString("queue","[]").putString("status","Đã tắt. Không nhận, không lưu, không gửi thông báo. Hàng đợi đã xóa.");
            edit.commit();
        }
        if(cancel!=null)cancel.disconnect();
        if(value)reconnect(c);
    }
    static String clock(){return new java.text.SimpleDateFormat("HH:mm:ss",java.util.Locale.getDefault()).format(new java.util.Date());}
    static void reconnect(Context c){if(!enabled(c))return;Context app=c.getApplicationContext();long epoch=generation;worker.execute(()->{if(!current(app,epoch))return;nextAttempt=0;lastHeartbeat=0;drain(app);});}
    static void enqueue(Context c,JSONObject event){if(!accepts(c,event.optLong("postedAt",0)))return;Context app=c.getApplicationContext();long epoch=generation;worker.execute(()->{
        try{synchronized(gate){if(!current(app,epoch)||!accepts(app,event.optLong("postedAt",0)))return;JSONArray queue=new JSONArray(prefs(app).getString("queue","[]"));boolean exists=false;
            for(int i=0;i<queue.length();i++)if(queue.getJSONObject(i).optString("id").equals(event.optString("id")))exists=true;
            if(!exists){if(queue.length()>=500){prefs(app).edit().putString("status","Hàng đợi đầy (500). Hãy kết nối máy tính; thông báo mới chưa được lưu.").commit();return;}queue.put(event);if(!prefs(app).edit().putString("queue",queue.toString()).commit())throw new Exception("Không lưu được thông báo chờ");}
            if("demo".equals(event.optString("packageName"))){nextAttempt=0;lastHeartbeat=0;}}drain(app);
        }catch(Exception e){synchronized(gate){if(current(app,epoch))prefs(app).edit().putString("status","Lỗi hàng đợi: "+e.getMessage()).commit();}}
    });}
    static void flush(Context c){if(!enabled(c))return;Context app=c.getApplicationContext();long epoch=generation;worker.execute(()->{if(current(app,epoch))drain(app);});}
    static int post(Context c,long epoch,String base,String token,String endpoint,JSONObject payload)throws Exception{
        HttpURLConnection conn;
        synchronized(gate){if(!current(c,epoch))throw new Exception("Đã tắt chuyển tiếp");conn=(HttpURLConnection)new URL(base+endpoint).openConnection();activeConnection=conn;}
        try{conn.setInstanceFollowRedirects(false);conn.setConnectTimeout(4000);conn.setReadTimeout(4000);conn.setRequestMethod("POST");conn.setDoOutput(true);conn.setRequestProperty("Content-Type","application/json; charset=utf-8");conn.setRequestProperty("Authorization","Bearer "+token);
            byte[] bytes=payload.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);conn.setFixedLengthStreamingMode(bytes.length);try(java.io.OutputStream out=conn.getOutputStream()){out.write(bytes);}return conn.getResponseCode();
        }finally{conn.disconnect();synchronized(gate){if(activeConnection==conn)activeConnection=null;}}
    }
    static void heartbeat(Context c,long epoch,String base,String token,int pending)throws Exception{
        SharedPreferences p=prefs(c);String id=p.getString("deviceId","");if(id.isEmpty()){id=java.util.UUID.randomUUID().toString();p.edit().putString("deviceId",id).commit();}
        JSONObject beat=new JSONObject();beat.put("deviceId",id);beat.put("name",android.os.Build.MANUFACTURER+" "+android.os.Build.MODEL);beat.put("pending",pending);beat.put("listenerEnabled",listenerConnected);
        int code=post(c,epoch,base,token,"/api/heartbeat",beat);if(code<200||code>=300)throw new Exception("Heartbeat HTTP "+code+(code==401?" - sai mã ghép nối":""));lastHeartbeat=android.os.SystemClock.elapsedRealtime();
    }
    static void drain(Context c){
        long epoch=generation;if(!current(c,epoch))return;
        SharedPreferences p=prefs(c);String base=p.getString("url",""),token=p.getString("token","");if(base.isEmpty()||token.isEmpty()||android.os.SystemClock.elapsedRealtime()<nextAttempt)return;
        try{JSONArray queue=new JSONArray(p.getString("queue","[]"));if(queue.length()==0&&lastHeartbeat!=0&&android.os.SystemClock.elapsedRealtime()-lastHeartbeat<15000)return;heartbeat(c,epoch,base,token,queue.length());
            boolean sent=false;
            while(queue.length()>0){int code=post(c,epoch,base,token,"/api/notifications",queue.getJSONObject(0));
                if(code<200||code>=300)throw new Exception("HTTP "+code+(code==401?" - kiểm tra mã ghép nối":"; giữ thông báo trong hàng đợi"));
                synchronized(gate){if(!current(c,epoch))return;queue.remove(0);if(!p.edit().putString("queue",queue.toString()).commit())throw new Exception("Không lưu được trạng thái gửi");}sent=true;
                if(android.os.SystemClock.elapsedRealtime()-lastHeartbeat>=15000)heartbeat(c,epoch,base,token,queue.length());
            }
            if(sent)heartbeat(c,epoch,base,token,0);
            failures=0;nextAttempt=0;
            synchronized(gate){if(current(c,epoch))p.edit().putString("status","Máy tính đã xác nhận kết nối lúc "+clock()+"\nHàng đợi: "+queue.length()+" · tự gửi lại khi mất mạng").commit();}
        }catch(Exception e){synchronized(gate){if(!current(c,epoch))return;int delay=Math.min(60,5*(1<<Math.min(failures++,4)));nextAttempt=android.os.SystemClock.elapsedRealtime()+delay*1000L;lastHeartbeat=0;
            p.edit().putString("status","Mất kết nối / gửi chưa thành công: "+e.getMessage()+"\nThông báo chờ vẫn được giữ. Thử lại sau "+delay+" giây; mở app hoặc gửi thử để nối lại ngay.").commit();
        }}
    }
}
