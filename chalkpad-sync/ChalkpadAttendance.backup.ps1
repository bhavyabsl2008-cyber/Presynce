# Presynce - Chalkpad Mobile Sync
# Reference implementation reconstructed from the mobile API investigation.
#
# IMPORTANT:
# - This targets the mobile API, NOT the Chalkpad website.
# - It does not invent authentication.
# - The exact commonPage request body is intentionally supplied by the caller.
# - Do not put passwords/tokens into this file.

$ChalkpadEndpoint = "https://cuiet.codebrigade.in/mobilev2/commonPage"

function Invoke-ChalkpadCommonPage {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Body,

        [Microsoft.PowerShell.Commands.WebRequestSession]$Session
    )

    if ([string]::IsNullOrWhiteSpace($Body)) {
        throw "commonPage request body is required. The exact body was not recovered and will not be guessed."
    }

    $params = @{
        Uri         = $ChalkpadEndpoint
        Method      = "POST"
        ContentType = "application/x-www-form-urlencoded; charset=UTF-8"
        UserAgent   = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
        Body        = $Body
    }

    if ($null -ne $Session) {
        $params.WebSession = $Session
    }

    Invoke-WebRequest @params
}


function Convert-ChalkpadHtml {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Html
    )

    $records = @()

    # Chalkpad returns repeated attendance blocks using tt-box-new.
    # Each block contains subject, code, Delivered, Attended, Absent,
    # DL, ML and Total Percentage.

    $blocks = [regex]::Matches(
        $Html,
        "(?is)<div\s+class=['""]tt-box-new['""]>(.*?)(?=<div\s+class=['""]tt-box-new['""]>|</div>\s*</div>\s*</div>\s*</div>\s*$)"
    )

    foreach ($block in $blocks) {
        $htmlBlock = $block.Groups[1].Value

        $spans = [regex]::Matches(
            $htmlBlock,
            "(?is)<span[^>]*>(.*?)</span>"
        ) | ForEach-Object {
            ($_.Groups[1].Value -replace "<[^>]+>", " " -replace "&nbsp;", " " -replace "\s+", " ").Trim()
        }

        if ($spans.Count -lt 2) {
            continue
        }

        $subject = $spans[0]
        $code    = $spans[1]

        $cleanBlock = $htmlBlock `
            -replace "<[^>]+>", " " `
            -replace "&nbsp;", " " `
            -replace "\s+", " "

        $cleanBlock = $cleanBlock.Trim()

        $deliveredMatch = [regex]::Match(
            $cleanBlock,
            "(?i)Delivered\s*:\s*(\d+)"
        )

        $attendedMatch = [regex]::Match(
            $cleanBlock,
            "(?i)Attended\s*:\s*(\d+)"
        )

        $absentMatch = [regex]::Match(
            $cleanBlock,
            "(?i)Absent\s*:\s*(\d+)"
        )

        $dlMatch = [regex]::Match(
            $cleanBlock,
            "(?i)\bDL\s*:\s*(\d+)"
        )

        $mlMatch = [regex]::Match(
            $cleanBlock,
            "(?i)\bML\s*:\s*(\d+)"
        )

        $percentageMatch = [regex]::Match(
            $cleanBlock,
            "(?i)Total Percentage\s*:\s*([\d.]+)\s*%"
        )

        if (
            $deliveredMatch.Success -and
            $attendedMatch.Success -and
            $absentMatch.Success -and
            $percentageMatch.Success
        ) {
            $records += [PSCustomObject]@{
                Subject    = $subject
                Code       = $code
                Delivered  = [int]$deliveredMatch.Groups[1].Value
                Attended   = [int]$attendedMatch.Groups[1].Value
                Absent     = [int]$absentMatch.Groups[1].Value
                ApprovedDL = if ($dlMatch.Success) {
                    [int]$dlMatch.Groups[1].Value
                } else {
                    0
                }
                ApprovedML = if ($mlMatch.Success) {
                    [int]$mlMatch.Groups[1].Value
                } else {
                    0
                }
                Percentage = [double]$percentageMatch.Groups[1].Value
            }
        }
    }

    return $records
}
    # Normalize the response HTML.
    $clean = $Html `
        -replace '<[^>]+>', ' ' `
        -replace '&nbsp;', ' ' `
        -replace '\\n|\\t', ' ' `
        -replace '\s+', ' '

    $clean = $clean.Trim()

    $pattern = '(?is)<span>([^<]+)</span>\s*<span>([^<]+)</span>.*?Delivered\s*:\s*</b>\s*(\d+).*?Attended\s*:\s*</b>\s*(\d+).*?Absent\s*:\s*</b>\s*(\d+).*?Total Percentage\s*:\s*</b>\s*([\d.]+)%'

    $matches = [regex]::Matches($Html, $pattern)

    $records = @()

    foreach ($match in $matches) {
        $records += [PSCustomObject]@{
            Subject   = $match.Groups[1].Value.Trim()
            Code      = $match.Groups[2].Value.Trim()
            Delivered = [int]$match.Groups[3].Value
            Attended  = [int]$match.Groups[4].Value
            Absent    = [int]$match.Groups[5].Value
            Percentage = [double]$match.Groups[6].Value
            ApprovedDL = 0
            ApprovedML = 0
        }
    }

    return $records
}


function Get-ChalkpadAttendance {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Body,

        [Microsoft.PowerShell.Commands.WebRequestSession]$Session
    )

    $response = Invoke-ChalkpadCommonPage -Body $Body -Session $Session

    $html = $response.Content

    if ([string]::IsNullOrWhiteSpace($html)) {
        throw "Chalkpad returned an empty response."
    }

    $records = Convert-ChalkpadHtml -Html $html

    if ($records.Count -eq 0) {
        throw "No attendance records were parsed from the commonPage response."
    }

    return $records
}


function Get-AttendanceStatus {
    param(
        [Parameter(Mandatory = $true)]
        [array]$Attendance
    )

    $results = foreach ($item in $Attendance) {

        $effectiveAttended =
            [int]$item.Attended +
            [int]$item.ApprovedDL +
            [int]$item.ApprovedML

        $delivered = [int]$item.Delivered

        if ($delivered -le 0) {
            [PSCustomObject]@{
                Subject       = $item.Subject
                Percentage    = 0
                Status        = "NO DATA"
                ClassesNeeded = 0
                CanMiss       = 0
            }

            continue
        }

        $percentage =
            ($effectiveAttended / $delivered) * 100

        if ($percentage -ge 75) {

            # Maximum additional classes that can be missed
            # while remaining at or above 75%.
            $canMiss = [math]::Floor(
                ($effectiveAttended / 0.75) - $delivered
            )

            if ($canMiss -lt 0) {
                $canMiss = 0
            }

            [PSCustomObject]@{
                Subject       = $item.Subject
                Percentage    = [math]::Round($percentage, 2)
                Status        = "SAFE"
                ClassesNeeded = 0
                CanMiss       = $canMiss
            }
        }
        else {

            # Number of consecutive classes required
            # to reach 75%.
            $needed = [math]::Ceiling(
                (0.75 * $delivered - $effectiveAttended) / 0.25
            )

            if ($needed -lt 0) {
                $needed = 0
            }

            [PSCustomObject]@{
                Subject       = $item.Subject
                Percentage    = [math]::Round($percentage, 2)
                Status        = "BELOW 75%"
                ClassesNeeded = $needed
                CanMiss       = 0
            }
        }
    }

    return $results
}


function ConvertTo-ChalkpadBridgePayload {
    param(
        [Parameter(Mandatory = $true)]
        [array]$Attendance
    )

    $today = (Get-Date).ToString("yyyy-MM-dd")

    foreach ($item in $Attendance) {

        $effectiveAttended =
            [int]$item.Attended +
            [int]$item.ApprovedDL +
            [int]$item.ApprovedML

        [PSCustomObject]@{
            subjectName = $item.Subject
            subjectCode = $item.Code
            delivered   = [int]$item.Delivered
            attended    = $effectiveAttended
            dl          = [int]$item.ApprovedDL
            percentage  = if ([int]$item.Delivered -gt 0) {
                [math]::Round(
                    ($effectiveAttended / [int]$item.Delivered) * 100,
                    2
                )
            } else {
                0
            }
            dataAsOf    = $today
            source      = "Chalkpad"
        }
    }
}


function Show-ChalkpadAttendance {
    param(
        [Parameter(Mandatory = $true)]
        [array]$Attendance
    )

    $Attendance |
        Format-Table Subject, Code, Delivered, Attended, ApprovedDL, ApprovedML, Percentage -AutoSize

    Write-Host ""
    Write-Host "Attendance status:" -ForegroundColor Cyan

    Get-AttendanceStatus -Attendance $Attendance |
        Format-Table Subject, Percentage, Status, ClassesNeeded, CanMiss -AutoSize
}


function Export-ChalkpadBridgePayload {
    param(
        [Parameter(Mandatory = $true)]
        [array]$Attendance,

        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $payload = @(ConvertTo-ChalkpadBridgePayload -Attendance $Attendance)

    $payload |
        ConvertTo-Json -Depth 5 |
        Set-Content -Path $Path -Encoding UTF8

    Write-Host "Bridge payload written to:" -ForegroundColor Green
    Write-Host $Path
}


Write-Host "Presynce Chalkpad mobile sync loaded." -ForegroundColor Cyan
Write-Host "Endpoint: $ChalkpadEndpoint"
Write-Host ""
Write-Host "Known unresolved item: exact commonPage request body."
Write-Host "No authentication/device credential is generated by this script."
