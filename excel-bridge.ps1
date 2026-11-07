param([Parameter(Mandatory=$true)][string]$PayloadPath)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
$excel=$null;$book=$null;$sheet=$null;$range=$null;$scan=$null
try {
  $payload=Get-Content -LiteralPath $PayloadPath -Raw -Encoding UTF8 | ConvertFrom-Json
  try {$excel=[Runtime.InteropServices.Marshal]::GetActiveObject('Excel.Application')} catch {throw 'Chua ket noi duoc Excel. Mo file chot ca, chon sheet can nhap va bam lai. Neu Excel dang chay voi quyen Administrator, hay mo Excel binh thuong.'}
  $book=$excel.ActiveWorkbook;$sheet=$excel.ActiveSheet
  if($null -eq $book -or $null -eq $sheet){throw 'Excel chua mo workbook va worksheet.'}
  if(($book.Name -replace '\.(xlsx|xlsm|xlsb|xls)$','') -ne [string]$payload.expectedWorkbook){throw "Sai file Excel dang chon: $($book.Name). Hay chon file $($payload.expectedWorkbook)."}
  if($sheet.Type -ne -4167){throw 'Hay chon mot worksheet trong Excel.'}
  if($book.ReadOnly -or $sheet.ProtectContents){throw 'File chi doc hoac sheet bi khoa. Hay mo quyen sua truoc.'}
  if(([string]$sheet.Range('C1').Text).Trim() -ne 'BANK'){throw 'Sheet dang chon khong co BANK o C1. Hay chon dung sheet chot ca.'}
  $count=@($payload.values).Count
  if($count -lt 1 -or $count -gt 1000){throw 'So giao dich phai tu 1 den 1000.'}
  $rangeName='C2:C'+($count+1);$range=$sheet.Range($rangeName)
  if($range.MergeCells -ne $false){throw 'Vung BANK co o gop. Khong the ghi an toan.'}
  $old=@();$existing=0
  for($i=1;$i -le $count;$i++){$cell=$range.Cells.Item($i,1);try{if($cell.HasFormula){throw 'Vung ghi co cong thuc. Khong ghi de cong thuc.'};$v=$cell.Value2;if($null -ne $v -and [string]$v -ne ''){$existing++};$old+=,$v}finally{[void][Runtime.InteropServices.Marshal]::ReleaseComObject($cell)}}
  # Stop at the first blank: never erase data below a separate section.
  $tail=0;$tailValues=@()
  for($r=$count+2;$r -le 1001;$r++){$cell=$sheet.Cells.Item($r,3);try{if($cell.HasFormula){break};$v=$cell.Value2;if($null -eq $v -or [string]$v -eq ''){break};if($v -isnot [double] -and $v -isnot [int]){break};$tail++;$tailValues+=,$v}finally{[void][Runtime.InteropServices.Marshal]::ReleaseComObject($cell)}}
  $identity=[ordered]@{fullName=[string]$book.FullName;sheet=[string]$sheet.Name;codeName=[string]$sheet.CodeName;old=$old;tail=$tail;tailValues=$tailValues}
  $identityJson=ConvertTo-Json -InputObject $identity -Compress -Depth 5
  $sha=[Security.Cryptography.SHA256]::Create();try{$fingerprint=([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($identityJson)))).Replace('-','')}finally{$sha.Dispose()}
  if($payload.mode -eq 'write'){
    if($fingerprint -ne [string]$payload.fingerprint){throw 'File, sheet hoac du lieu BANK da thay doi sau khi xem truoc. Hay bam Ghi vao Excel de xem lai.'}
    if($excel.Ready -ne $true){throw 'Excel dang nhap lieu hoac mo hop thoai. Nhan Enter/Esc trong Excel roi thu lai.'}
    $values=New-Object 'object[,]' ($count+$tail),1
    for($i=0;$i -lt $count;$i++){$n=[double]$payload.values[$i];if([double]::IsNaN($n) -or [double]::IsInfinity($n) -or $n -le 0){throw 'So tien BANK khong hop le.'};$values[$i,0]=$n}
    $previousEvents=$excel.EnableEvents
    try{$scan=$sheet.Range(('C2:C'+($count+1+$tail)));if($scan.MergeCells -ne $false){throw 'Vung BANK co o gop.'};$excel.EnableEvents=$false;$scan.Value2=$values
      for($i=1;$i -le $count;$i++){if([double]$range.Cells.Item($i,1).Value2 -ne [double]$payload.values[$i-1]){throw 'Khong xac minh duoc so lieu sau khi ghi. Kiem tra lai Excel.'}}
    }finally{$excel.EnableEvents=$previousEvents}
  }
  [ordered]@{workbook=[string]$book.Name;sheet=[string]$sheet.Name;range=$rangeName;count=$count;existingCount=$existing;tail=$tail;tailRange=if($tail){'C'+($count+2)+':C'+($count+1+$tail)}else{''};fingerprint=$fingerprint} | ConvertTo-Json -Compress -Depth 5
}catch{[ordered]@{error=$_.Exception.Message}|ConvertTo-Json -Compress;exit 1}
finally{foreach($obj in @($scan,$range,$sheet,$book,$excel)){if($null -ne $obj -and [Runtime.InteropServices.Marshal]::IsComObject($obj)){[void][Runtime.InteropServices.Marshal]::ReleaseComObject($obj)}}}
