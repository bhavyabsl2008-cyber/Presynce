# ============================================
# Presynce Chalkpad Attendance Sync
# ============================================

$script:ChalkpadBaseUrl = "https://cuiet.codebrigade.in/mobilev2"
$script:ChalkpadLoginUrl = "$script:ChalkpadBaseUrl/appLoginAuthV2"
$script:ChalkpadCommonPageUrl = "$script:ChalkpadBaseUrl/commonPage"

$script:ChalkpadAttendancePageId = "28"

$script:ChalkpadDeviceId = "88437E4C-4E1D-4104-964A-7DE41B163E06"

$script:ChalkpadSecurityToken = "be91f0f1aeba33d751fb901b8652bf98805cded69305fcb73a488c9a9d9c3ec857e4d0b323095b1a437f3c9df7f09a46be437636c583010463b40dd02926136126ff582c5a6a702310a62f9f0eba20dfc2df5cbce3cf9209b5c1dc6a4b990d9f518d4f6dfa630941a66ac4c2117308eb"


# ============================================
# HTML HELPERS
# ============================================

function Convert-ChalkpadText {

    param(
        [AllowNull()]
        [string]$Value
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $text = $Value

    # Chalkpad sometimes sends &nbsp without a semicolon.
    $text = $text -replace "(?i)&nbsp;?", " "

    # Remove HTML tags.
    $text = $text -replace "(?is)<br\s*/?>", " "
    $text = $text -replace "(?is)<[^>]+>", " "

    # Decode normal HTML entities.
    $text = [System.Net.WebUtility]::HtmlDecode($text)

    # Normalise whitespace.
    $text = $text -replace "\s+", " "

    return $text.Trim()
}


function Get-ChalkpadNumber {

    param(
        [AllowNull()]
        [string]$Value
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return 0
    }

    $match = [regex]::Match(
        $Value,
        "\d+"
    )

    if ($match.Success) {
        return [int]$match.Value
    }

    return 0
}


function Get-ChalkpadPercentage {

    param(
        [AllowNull()]
        [string]$Value
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return 0
    }

    $match = [regex]::Match(
        $Value,
        "\d+(?:\.\d+)?"
    )

    if ($match.Success) {

        $number = 0.0

        if (
            [double]::TryParse(
                $match.Value,
                [System.Globalization.NumberStyles]::Any,
                [System.Globalization.CultureInfo]::InvariantCulture,
                [ref]$number
            )
        ) {
            return $number
        }
    }

    return 0
}


function Get-ChalkpadFieldValue {

    param(
        [AllowNull()]
        [string]$Text,

        [Parameter(Mandatory)]
        [string]$Label
    )

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return ""
    }

    $escapedLabel = [regex]::Escape($Label)

    # Matches:
    # Teacher : Baljit Kaur
    # Delivered : 32
    # Total Percentage : 81.25%
    #
    # Stops before the next "Word :" label or end of line.

    $pattern = "(?i)$escapedLabel\s*:\s*(.*?)(?=\s+[A-Za-z][A-Za-z ]{0,30}\s*:|$)"

    $match = [regex]::Match(
        $Text,
        $pattern
    )

    if ($match.Success) {
        return $match.Groups[1].Value.Trim()
    }

    return ""
}


function Get-ChalkpadAttendanceWithLogin {

    [CmdletBinding()]

    param()

    Write-Host ""
    Write-Host "Logging into Chalkpad..." `
        -ForegroundColor Cyan


    # ============================================
    # LOGIN CREDENTIALS
    # ============================================

    $username = Read-Host "Chalkpad username"

    $passwordSecure = Read-Host `
        "Chalkpad password" `
        -AsSecureString


    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
        $passwordSecure
    )


    try {

        $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
            $passwordPointer
        )
    }
    finally {

        if ($passwordPointer -ne [IntPtr]::Zero) {

            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR(
                $passwordPointer
            )
        }
    }


    try {

        $webSession = New-Object `
            Microsoft.PowerShell.Commands.WebRequestSession


        # ============================================
        # LOGIN
        # ============================================

        $loginBody = @{
            deviceIdUUID = $script:ChalkpadDeviceId
            txtUsername  = $username
            txtPassword  = $password
        }


        $loginHeaders = @{
            Accept = "application/json, text/javascript, */*; q=0.01"

            "Accept-Language" = "en-US,en;q=0.9"

            Origin = "null"

            "User-Agent" = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
        }


        $loginResponse = Invoke-WebRequest `
            -Uri $script:ChalkpadLoginUrl `
            -Method POST `
            -Body $loginBody `
            -ContentType "application/x-www-form-urlencoded; charset=UTF-8" `
            -Headers $loginHeaders `
            -WebSession $webSession `
            -ErrorAction Stop


        if (
            [string]::IsNullOrWhiteSpace(
                $loginResponse.Content
            )
        ) {
            throw "Chalkpad returned an empty login response."
        }


        $loginJson = $loginResponse.Content | ConvertFrom-Json


        if ($null -eq $loginJson) {
            throw "Chalkpad returned invalid login JSON."
        }


        if ([string]$loginJson.status -ne "4") {

            throw (
                "Chalkpad login failed. Returned status: " +
                [string]$loginJson.status
            )
        }


        if (
            $null -eq $loginJson.data -or
            $loginJson.data.Count -lt 1
        ) {
            throw "Chalkpad login succeeded but returned no user data."
        }


        $user = $loginJson.data[0]


        if (
            [string]::IsNullOrWhiteSpace(
                [string]$user.userId
            )
        ) {
            throw "Chalkpad login returned no userId."
        }


        Write-Host "Login successful." `
            -ForegroundColor Green

        Write-Host "Logged in as: $($user.name)" `
            -ForegroundColor Cyan


        # ============================================
        # FETCH ATTENDANCE
        # ============================================

        Write-Host "Fetching attendance..." `
            -ForegroundColor Cyan


        $commonPageBody = @{
            commonObj = ""
            commonPageId = $script:ChalkpadAttendancePageId
            device = ""
            userId = [string]$user.userId
            sessionId = [string]$user.sessionId
            roleId = [string]$user.roleId
            securityToken = $script:ChalkpadSecurityToken
            deviceIdUUID = $script:ChalkpadDeviceId
        }


        $commonPageHeaders = @{
            Accept = "*/*"

            "Accept-Language" = "en-US,en;q=0.9"

            Origin = "null"

            "User-Agent" = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
        }


        $attendanceResponse = Invoke-WebRequest `
            -Uri $script:ChalkpadCommonPageUrl `
            -Method POST `
            -Body $commonPageBody `
            -ContentType "application/x-www-form-urlencoded; charset=UTF-8" `
            -Headers $commonPageHeaders `
            -WebSession $webSession `
            -ErrorAction Stop


        if (
            [string]::IsNullOrWhiteSpace(
                $attendanceResponse.Content
            )
        ) {
            throw "Chalkpad commonPage returned an empty response."
        }


        $attendanceJson = $attendanceResponse.Content | ConvertFrom-Json


        if ($null -eq $attendanceJson) {
            throw "Chalkpad commonPage returned invalid JSON."
        }


        $attendanceHtml = [string]$attendanceJson.content


        if (
            [string]::IsNullOrWhiteSpace(
                $attendanceHtml
            )
        ) {
            throw "Chalkpad commonPage returned no attendance content."
        }


        Write-Host "Attendance HTML received. Parsing subjects..." `
            -ForegroundColor Cyan


        # ============================================
        # EXTRACT SUBJECT BOXES
        #
        # We split on each tt-box-new opening tag.
        # This is much more reliable than trying to
        # match nested HTML divs with one regex.
        # ============================================

        $boxParts = [regex]::Split(
            $attendanceHtml,
            "(?is)<div\s+class\s*=\s*['""]tt-box-new['""][^>]*>"
        )


        if ($boxParts.Count -lt 2) {
            throw "Attendance HTML was received but no subject boxes were found."
        }


        $subjects = @()


        # Skip the content before the first subject box.

        for (
            $index = 1;
            $index -lt $boxParts.Count;
            $index++
        ) {

            $boxHtml = $boxParts[$index]


            # ========================================
            # SUBJECT NAME + COURSE CODE
            # ========================================

            $headingPattern = "(?is)<div\s+class\s*=\s*['""]tt-period-number['""][^>]*>.*?<span>(.*?)</span>\s*<span>(.*?)</span>"


            $headingMatch = [regex]::Match(
                $boxHtml,
                $headingPattern
            )


            if (-not $headingMatch.Success) {
                continue
            }


            $subjectName = Convert-ChalkpadText `
                $headingMatch.Groups[1].Value


            $courseCode = Convert-ChalkpadText `
                $headingMatch.Groups[2].Value


            if (
                [string]::IsNullOrWhiteSpace(
                    $subjectName
                )
            ) {
                continue
            }


            # ========================================
            # CONVERT THIS ENTIRE SUBJECT BOX TO TEXT
            #
            # Example result:
            #
            # Teacher : Baljit Kaur
            # From : 02 Jul 2026 TO : 24 Aug 2026
            # Delivered : 32
            # Attended : 24
            # ...
            # ========================================

            $boxText = Convert-ChalkpadText $boxHtml


            # ========================================
            # EXTRACT FIELDS
            # ========================================

            $teacher = Get-ChalkpadFieldValue `
                -Text $boxText `
                -Label "Teacher"


            # "From" has "TO" in the same div.
            # Capture it separately and remove TO.
            $fromMatch = [regex]::Match(
                $boxText,
                "(?i)From\s*:\s*(.*?)\s+TO\s*:"
            )

            if ($fromMatch.Success) {
                $from = $fromMatch.Groups[1].Value.Trim()
            }
            else {
                $from = Get-ChalkpadFieldValue `
                    -Text $boxText `
                    -Label "From"
            }


            $deliveredText = Get-ChalkpadFieldValue `
                -Text $boxText `
                -Label "Delivered"


            $attendedText = Get-ChalkpadFieldValue `
                -Text $boxText `
                -Label "Attended"


            $absentText = Get-ChalkpadFieldValue `
                -Text $boxText `
                -Label "Absent"


            # DL and ML appear in the same HTML row.
            # Extract DL directly and stop at ML.

            $dlMatch = [regex]::Match(
                $boxText,
                "(?i)DL\s*:\s*(\d+)"
            )

            if ($dlMatch.Success) {
                $dlText = $dlMatch.Groups[1].Value
            }
            else {
                $dlText = ""
            }


            $percentageText = Get-ChalkpadFieldValue `
                -Text $boxText `
                -Label "Total Percentage"


            # ========================================
            # CONVERT VALUES
            # ========================================

            $delivered = Get-ChalkpadNumber $deliveredText

            $attended = Get-ChalkpadNumber $attendedText

            $absent = Get-ChalkpadNumber $absentText

            $dl = Get-ChalkpadNumber $dlText

            $percentage = Get-ChalkpadPercentage $percentageText


            # ========================================
            # ADD SUBJECT
            # ========================================

            $subjects += [PSCustomObject]@{

                subject = $subjectName

                courseCode = $courseCode

                teacher = $teacher

                from = $from

                delivered = $delivered

                attended = $attended

                absent = $absent

                dl = $dl

                percentage = $percentage
            }
        }


        if ($subjects.Count -eq 0) {
            throw "Attendance HTML was returned but no subjects could be parsed."
        }


        # ============================================
        # CALCULATE TOTALS
        # ============================================

        $totalDelivered = (
            $subjects |
            Measure-Object `
                -Property delivered `
                -Sum
        ).Sum


        $totalAttended = (
            $subjects |
            Measure-Object `
                -Property attended `
                -Sum
        ).Sum


        if ($null -eq $totalDelivered) {
            $totalDelivered = 0
        }


        if ($null -eq $totalAttended) {
            $totalAttended = 0
        }


        $overallPercentage = 0


        if ($totalDelivered -gt 0) {

            $overallPercentage = [math]::Round(
                (
                    [double]$totalAttended /
                    [double]$totalDelivered
                ) * 100,
                2
            )
        }


        Write-Host "Attendance fetched successfully." `
            -ForegroundColor Green

        Write-Host "$($subjects.Count) subjects found." `
            -ForegroundColor Green


        # ============================================
        # RETURN PRESYNCE DATA
        # ============================================

        return [PSCustomObject]@{

            fetchedAt = (
                Get-Date
            ).ToString(
                "yyyy-MM-ddTHH:mm:ss"
            )

            source = "Chalkpad"

            overallPercentage = $overallPercentage

            totalDelivered = [int]$totalDelivered

            totalAttended = [int]$totalAttended

            subjects = $subjects
        }
    }
    finally {

        $password = $null


        if ($passwordSecure) {
            $passwordSecure.Dispose()
        }
    }
}


function Get-ChalkpadAttendance {

    [CmdletBinding()]

    param()


    return Get-ChalkpadAttendanceWithLogin
}


Write-Host "Presynce Chalkpad mobile sync loaded." `
    -ForegroundColor Cyan

Write-Host "Run Get-ChalkpadAttendance to login and fetch attendance." `
    -ForegroundColor Yellow