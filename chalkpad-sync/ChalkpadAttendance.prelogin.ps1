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
        [string]$Html
    )

    $records = @()

    if ([string]::IsNullOrWhiteSpace($Html)) {
        return $records
    }

    # Decode HTML entities first (&nbsp;, etc.)
    Add-Type -AssemblyName System.Net
    $decoded = [System.Net.WebUtility]::HtmlDecode($Html)

    # Find each subject attendance box.
    $blocks = [regex]::Matches(
        $decoded,
        "(?is)<div\s+class=['""]tt-box-new['""]>(.*?)(?=<div\s+class=['""]tt-box-new['""]>|$)"
    )

    foreach ($match in $blocks) {
        $block = $match.Groups[1].Value

        # Subject + course code
        $subjectMatch = [regex]::Match(
            $block,
            "(?is)<div\s+class=['""]tt-period-number['""][^>]*>.*?<span>\s*(.*?)\s*</span>\s*<span>\s*(.*?)\s*</span>"
        )

        if (-not $subjectMatch.Success) {
            continue
        }

        $subject = $subjectMatch.Groups[1].Value.Trim()
        $code    = $subjectMatch.Groups[2].Value.Trim()

        # Convert this block to plain text.
        $plain = $block -replace '(?is)<[^>]+>', ' '
        $plain = $plain -replace '\s+', ' '
        $plain = $plain.Trim()

        # Helper for attendance numbers.
        function Read-ChalkpadNumber {
            param(
                [string]$Text,
                [string]$Label
            )

            $pattern = '(?i)' + [regex]::Escape($Label) + '\s*:\s*(?:&nbsp;|\s|&#160;)*(\d+(?:\.\d+)?)'

            $m = [regex]::Match($Text, $pattern)

            if ($m.Success) {
                return $m.Groups[1].Value
            }

            return "0"
        }

        $delivered   = Read-ChalkpadNumber $plain "Delivered"
        $attended    = Read-ChalkpadNumber $plain "Attended"
        $absent      = Read-ChalkpadNumber $plain "Absent"
        $dl          = Read-ChalkpadNumber $plain "DL"
        $ml          = Read-ChalkpadNumber $plain "ML"
        $percentage  = Read-ChalkpadNumber $plain "Total Percentage"

        $records += [PSCustomObject]@{
            Subject    = $subject
            Code       = $code
            Delivered  = [int]$delivered
            Attended   = [int]$attended
            Absent     = [int]$absent
            DL         = [int]$dl
            ML         = [int]$ml
            Percentage = [double]$percentage
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
