Option Explicit
Dim shell, files, root, mode, command
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
root = files.GetParentFolderName(WScript.ScriptFullName)
mode = "start"
If WScript.Arguments.Count > 0 Then
  If LCase(WScript.Arguments(0)) = "stop" Then mode = "stop"
End If
command = "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File """ & root & "\background.ps1"" -Mode " & mode
shell.Run command, 0, False
