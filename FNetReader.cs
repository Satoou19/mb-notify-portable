// Reads the machine ListView exposed by FNet; never sends machine commands.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Web.Script.Serialization;

class FNetReader {
 delegate bool EnumProc(IntPtr h,IntPtr p);
 [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb,IntPtr p);
 [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr h,EnumProc cb,IntPtr p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h,StringBuilder text,int max);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll",SetLastError=true)] static extern IntPtr SendMessageTimeout(IntPtr h,uint msg,IntPtr w,IntPtr l,uint flags,uint timeout,out UIntPtr result);
 [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr OpenProcess(uint access,bool inherit,uint pid);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
 [DllImport("kernel32.dll")] static extern bool IsWow64Process(IntPtr h,out bool wow64);
 [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr VirtualAllocEx(IntPtr h,IntPtr address,uint size,uint type,uint protect);
 [DllImport("kernel32.dll")] static extern bool VirtualFreeEx(IntPtr h,IntPtr address,uint size,uint type);
 [DllImport("kernel32.dll")] static extern bool WriteProcessMemory(IntPtr h,IntPtr address,byte[] data,int size,out IntPtr count);
 [DllImport("kernel32.dll")] static extern bool ReadProcessMemory(IntPtr h,IntPtr address,byte[] data,int size,out IntPtr count);
 static long Message(IntPtr h,uint msg,int row,IntPtr data) {
  UIntPtr result;
  if(SendMessageTimeout(h,msg,new IntPtr(row),data,2,500,out result)==IntPtr.Zero)throw new Exception("FNet không phản hồi hoặc khác quyền chạy. Mở MB Notify cùng quyền với FNet.");
  return (long)result.ToUInt64();
 }
 class Reader:IDisposable {
  IntPtr process,buffer;bool timedOut;
  public Reader(uint pid){
   process=OpenProcess(0x438,false,pid);
   if(process==IntPtr.Zero)throw new Exception("Không đọc được bảng FNet. Kiểm tra quyền chạy của hai ứng dụng.");
   bool wow64;
   if(Environment.Is64BitOperatingSystem&&(!IsWow64Process(process,out wow64)||!wow64)){CloseHandle(process);throw new Exception("Bộ đọc hiện hỗ trợ FNet 32-bit. Phiên bản FNet này cần bộ đọc tương ứng.");}
   buffer=VirtualAllocEx(process,IntPtr.Zero,8192,0x3000,4);
   if(buffer==IntPtr.Zero){CloseHandle(process);throw new Exception("Không tạo được bộ đệm đọc bảng FNet.");}
  }
  public string Text(IntPtr list,int row,int column,bool header){
   byte[] item=new byte[256];IntPtr written;
   Action<int,int> put=(offset,value)=>Array.Copy(BitConverter.GetBytes(value),0,item,offset,4);
   put(0,header?4:1);put(8,column);
   int pointer=unchecked((int)(buffer.ToInt64()+256));
   put(header?12:20,pointer);put(header?16:24,2048);
   if(!WriteProcessMemory(process,buffer,item,item.Length,out written)||written.ToInt32()!=item.Length)throw new Exception("Không ghi được bộ đệm trao đổi.");
   long length;
   try{length=Message(list,header?0x105FU:0x1073U,header?column:row,buffer);}
   catch{timedOut=true;throw;}
   if(!header&&length>=2047)throw new Exception("Nội dung ô FNet vượt giới hạn đọc.");
   byte[] text=new byte[4096];
   if(!ReadProcessMemory(process,new IntPtr(buffer.ToInt64()+256),text,text.Length,out written))throw new Exception("Không đọc được nội dung bảng FNet.");
   return Encoding.Unicode.GetString(text).Split('\0')[0].Trim();
  }
  public void Dispose(){if(buffer!=IntPtr.Zero&&!timedOut)VirtualFreeEx(process,buffer,0,0x8000);if(process!=IntPtr.Zero)CloseHandle(process);}
 }
 static void Main(string[] args){
  Console.OutputEncoding=new UTF8Encoding(false);
  try{
   var pids=new HashSet<uint>();
   foreach(var p in Process.GetProcessesByName("Server"))try{if(p.MainModule.FileName.IndexOf("FNet",StringComparison.OrdinalIgnoreCase)>=0)pids.Add((uint)p.Id);}catch{}
   if(pids.Count==0)throw new Exception("Chưa tìm thấy FNet Server đang chạy trên máy này.");
   var lists=new List<IntPtr>();
   EnumWindows((top,unused)=>{uint pid;GetWindowThreadProcessId(top,out pid);if(pids.Contains(pid))EnumChildWindows(top,(child,param)=>{var name=new StringBuilder(256);GetClassName(child,name,256);if(name.ToString()=="SysListView32")lists.Add(child);return true;},IntPtr.Zero);return true;},IntPtr.Zero);
   var candidates=new List<object>();
   foreach(var list in lists){
    uint pid;GetWindowThreadProcessId(list,out pid);
    int count=(int)Message(list,0x1004,0,IntPtr.Zero);
    var header=new IntPtr(Message(list,0x101F,0,IntPtr.Zero));
    int columns=header==IntPtr.Zero?0:(int)Message(header,0x1200,0,IntPtr.Zero);
    if(columns<2||columns>32||count>2000)continue;
    using(var reader=new Reader(pid)){
     var headers=new List<string>();for(int c=0;c<columns;c++)headers.Add(reader.Text(list,0,c,true));
     if(args.Length>0&&args[0]=="--diagnose"){candidates.Add(new {columns=headers,count=count});continue;}
     if(!headers.Exists(h=>h.ToLowerInvariant().Contains("tên máy"))||!headers.Exists(h=>h.ToLowerInvariant().Contains("tình trạng")))continue;
     var rows=new List<List<string>>();
     for(int i=0;i<count;i++){var row=new List<string>();for(int c=0;c<columns;c++)row.Add(reader.Text(list,i,c,false));rows.Add(row);}
     if(count!=(int)Message(list,0x1004,0,IntPtr.Zero))throw new Exception("Danh sách máy vừa thay đổi. Đang chờ lần đọc tiếp theo.");
     Console.Write(new JavaScriptSerializer().Serialize(new {ok=true,headers=headers,rows=rows}));return;
    }
   }
   if(args.Length>0){Console.Write(new JavaScriptSerializer().Serialize(candidates));return;}
   throw new Exception("Không thấy bảng Tên máy / Tình trạng. Mở danh sách máy trong FNet.");
  }catch(Exception error){Console.Write(new JavaScriptSerializer().Serialize(new {ok=false,error=error.Message}));Environment.ExitCode=1;}
 }
}
