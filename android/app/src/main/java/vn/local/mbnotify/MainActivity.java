package vn.local.mbnotify;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.provider.Settings;
import android.widget.*;
import android.graphics.Color;
import android.text.InputType;

public class MainActivity extends Activity {
    EditText url,token; TextView status; Switch power; Button testButton; boolean resumed=false;
    void text(LinearLayout layout,String value,int size){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(Color.rgb(25,48,70));t.setPadding(0,20,0,12);layout.addView(t);}
    void button(LinearLayout layout,String title,Runnable action){Button b=new Button(this);b.setText(title);b.setOnClickListener(v->action.run());layout.addView(b);}
    @Override public void onCreate(Bundle state){super.onCreate(state);
        ScrollView scroll=new ScrollView(this);LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);int pad=(int)(24*getResources().getDisplayMetrics().density);layout.setPadding(pad,pad,pad,pad);scroll.addView(layout);setContentView(scroll);
        text(layout,"MB Notify",30);text(layout,"Chuyển thông báo MB Bank lên máy tính qua mạng nội bộ. Không cần đăng nhập ngân hàng.",16);
        power=new Switch(this);power.setTextSize(20);power.setPadding(0,20,0,20);power.setChecked(Relay.enabled(this));power.setText(power.isChecked()?"Chuyển tiếp: ĐANG BẬT":"Chuyển tiếp: ĐÃ TẮT");layout.addView(power);
        text(layout,"Tắt: không nhận, không lưu thông báo mới và xóa hàng đợi chưa gửi. Bật lại: chỉ nhận thông báo mới từ thời điểm bật. Không cần giữ màn hình app mở khi đang bật.",14);
        text(layout,"Địa chỉ máy tính",16);url=new EditText(this);url.setSingleLine(true);url.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_URI);url.setHint("http://192.168.1.100:3189");url.setText(Relay.prefs(this).getString("url","http://192.168.1.100:3189"));layout.addView(url);
        text(layout,"Mã ghép nối trên máy tính",16);token=new EditText(this);token.setSingleLine(true);token.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);token.setText(Relay.prefs(this).getString("token",""));layout.addView(token);
        button(layout,"1. Lưu kết nối",()->{if(save())Toast.makeText(this,"Đã lưu",Toast.LENGTH_SHORT).show();});
        button(layout,"2. Cấp quyền đọc thông báo",()->startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));
        button(layout,"3. Gửi thử kết nối",()->{if(!Relay.enabled(this)||!save())return;try{org.json.JSONObject event=new org.json.JSONObject();event.put("id","test-"+java.util.UUID.randomUUID());event.put("packageName","demo");event.put("title","MB Notify · Android");event.put("text","Đã kết nối điện thoại với máy tính. Đây là thông báo thử.");event.put("postedAt",System.currentTimeMillis());Relay.enqueue(this,event);}catch(Exception e){Toast.makeText(this,e.getMessage(),Toast.LENGTH_LONG).show();}});
        testButton=(Button)layout.getChildAt(layout.getChildCount()-1);testButton.setEnabled(Relay.enabled(this));
        status=new TextView(this);status.setPadding(0,24,0,24);layout.addView(status);
        power.setOnCheckedChangeListener((view,checked)->{Relay.setEnabled(this,checked);power.setText(checked?"Chuyển tiếp: ĐANG BẬT":"Chuyển tiếp: ĐÃ TẮT");testButton.setEnabled(checked);handler.removeCallbacks(update);if(checked){android.service.notification.NotificationListenerService.requestRebind(new android.content.ComponentName(this,MbListener.class));if(resumed)handler.post(update);}else{MbListener.pause();refreshStatus();}});
        text(layout,"Chỉ thông báo từ ứng dụng MB Bank được chuyển tiếp. Nội dung OTP bị loại bỏ. Android cấp quyền đọc thông báo ở cấp hệ thống; app lọc theo gói com.mbmobile trước khi lưu/gửi.\n\nGiữ hai thiết bị cùng mạng; để máy tính chạy server. Khi mất mạng, thông báo được giữ trong hàng đợi (tối đa 500) và gửi lại khi dịch vụ hoạt động.\n\nChỉ sử dụng Wi-Fi tin cậy: HTTP nội bộ chưa mã hóa. Nếu máy tính không nhận, kiểm tra tường lửa và địa chỉ IP.\n\nNếu quyền bị chặn khi cài APK, vào Thông tin ứng dụng > menu ⋮ > Cho phép cài đặt bị hạn chế, rồi cấp quyền thông báo. Tùy điện thoại, có thể cần cho phép hoạt động nền.",14);
    }
    boolean save(){try{String address=url.getText().toString().trim().replaceAll("/+$","");java.net.URI uri=new java.net.URI(address);String host=uri.getHost();if(host==null||!(uri.getScheme().equals("http")||uri.getScheme().equals("https"))||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null||!(uri.getPath()==null||uri.getPath().isEmpty()))throw new Exception("Địa chỉ phải có dạng http://IP:3189");if(token.getText().toString().trim().length()<16)throw new Exception("Nhập đúng mã ghép nối trên máy tính");Relay.prefs(this).edit().putString("url",address).putString("token",token.getText().toString().trim()).commit();Relay.reconnect(this);return true;}catch(Exception e){Toast.makeText(this,e.getMessage(),Toast.LENGTH_LONG).show();return false;}}
    void refreshStatus(){if(!Relay.enabled(this)){status.setText("ĐÃ TẮT\nKhông nhận, không lưu và không gửi thông báo.\nHàng đợi đã xóa. Bật lại chỉ nhận thông báo mới.\nMáy tính sẽ báo mất liên lạc sau tối đa 45 giây.");return;}String allowed=Settings.Secure.getString(getContentResolver(),"enabled_notification_listeners");boolean enabled=allowed!=null&&allowed.contains(getPackageName()+"/");status.setText("Quyền thông báo: "+(enabled?"đã bật":"chưa bật")+"\nDịch vụ đọc: "+(Relay.listenerConnected?"đang hoạt động":"chưa hoạt động")+"\n"+Relay.prefs(this).getString("status","Chưa gửi thông báo"));}
    final android.os.Handler handler=new android.os.Handler(android.os.Looper.getMainLooper());final Runnable update=new Runnable(){public void run(){refreshStatus();if(resumed&&Relay.enabled(MainActivity.this)){Relay.flush(MainActivity.this);handler.postDelayed(this,2000);}}};
    @Override protected void onResume(){super.onResume();resumed=true;refreshStatus();handler.removeCallbacks(update);if(Relay.enabled(this)){handler.post(update);Relay.reconnect(this);android.service.notification.NotificationListenerService.requestRebind(new android.content.ComponentName(this,MbListener.class));}else MbListener.pause();}
    @Override protected void onPause(){resumed=false;super.onPause();handler.removeCallbacks(update);}
}
