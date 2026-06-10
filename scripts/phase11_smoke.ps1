param(
  [string]$BaseUrl = "http://localhost:8080/api"
)

$ErrorActionPreference = "Stop"

function Assert-True($Condition, $Message) {
  if (-not $Condition) {
    throw $Message
  }
}

function Invoke-ApiJson($Method, $Path, $Token = "", $Body = $null) {
  $headers = @{ Accept = "application/json" }
  if ($Token) {
    $headers.Authorization = "Bearer $Token"
  }

  $params = @{
    Uri = "$BaseUrl$Path"
    Method = $Method
    Headers = $headers
  }
  if ($null -ne $Body) {
    $params.ContentType = "application/json"
    $params.Body = ($Body | ConvertTo-Json -Depth 20)
  }

  Invoke-RestMethod @params
}

function Expect-ApiError($Method, $Path, $ExpectedStatus, $ExpectedCode, $Token = "", $Body = $null) {
  $headers = @{ Accept = "application/json" }
  if ($Token) {
    $headers.Authorization = "Bearer $Token"
  }

  $params = @{
    Uri = "$BaseUrl$Path"
    Method = $Method
    Headers = $headers
    ErrorAction = "Stop"
  }
  if ($null -ne $Body) {
    $params.ContentType = "application/json"
    $params.Body = ($Body | ConvertTo-Json -Depth 20)
  }

  try {
    Invoke-WebRequest @params | Out-Null
    throw "Expected $ExpectedCode from $Method $Path"
  } catch {
    $response = $_.Exception.Response
    if ($null -eq $response) {
      throw
    }

    $status = [int]$response.StatusCode
    $raw = $_.ErrorDetails.Message
    if (-not $raw) {
      $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
      $raw = $reader.ReadToEnd()
    }
    $payload = $raw | ConvertFrom-Json
    Assert-True ($status -eq $ExpectedStatus) "Expected HTTP $ExpectedStatus, got $status for $Method $Path"
    Assert-True ($payload.error.code -eq $ExpectedCode) "Expected error code $ExpectedCode, got $($payload.error.code)"
    return $payload
  }
}

function Upload-Material($Token, $FilePath) {
  Add-Type -AssemblyName System.Net.Http

  $client = New-Object System.Net.Http.HttpClient
  $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $Token)
  $content = New-Object System.Net.Http.MultipartFormDataContent
  $bytes = [System.IO.File]::ReadAllBytes($FilePath)
  $fileContent = New-Object System.Net.Http.ByteArrayContent -ArgumentList @(,$bytes)
  $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/pdf")
  $content.Add($fileContent, "file", [System.IO.Path]::GetFileName($FilePath))

  $response = $client.PostAsync("$BaseUrl/materials/extract", $content).Result
  $raw = $response.Content.ReadAsStringAsync().Result
  $payload = $raw | ConvertFrom-Json
  Assert-True ($response.IsSuccessStatusCode) "Material extraction failed: $raw"
  return $payload
}

function Login($Email, $Password) {
  Invoke-ApiJson "POST" "/auth/login" "" @{ email = $Email; password = $Password }
}

$adminLogin = Login "admin@teachery.local" "password"
$adminToken = $adminLogin.data.access_token
$adminMe = Invoke-ApiJson "GET" "/auth/me" $adminToken
Assert-True ($adminMe.data.role -eq "admin") "Admin login failed"

$guruLogin = Login "guru@teachery.local" "password"
$guruToken = $guruLogin.data.access_token
$guruMe = Invoke-ApiJson "GET" "/auth/me" $guruToken
Assert-True ($guruMe.data.role -eq "guru") "Guru login failed"

Expect-ApiError "POST" "/auth/login" 403 "INACTIVE_USER" "" @{ email = "inactive@teachery.local"; password = "password" } | Out-Null
$invalidTokenError = Expect-ApiError "GET" "/auth/me" 401 "TOKEN_INVALID" "invalid-token"
Assert-True ($null -ne $invalidTokenError.error.message) "Error response shape is invalid"
Expect-ApiError "GET" "/admin/users" 403 "UNAUTHORIZED" $guruToken | Out-Null

Expect-ApiError "PATCH" "/admin/users/$($adminMe.data.id)/status" 422 "LAST_ACTIVE_ADMIN_REQUIRED" $adminToken @{
  status = "inactive"
  reason = "Phase 11 last admin check"
} | Out-Null

$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$managedUser = Invoke-ApiJson "POST" "/admin/users" $adminToken @{
  name = "Phase 11 Guru"
  email = "phase11_$suffix@teachery.local"
  password = "password123"
  role = "guru"
  status = "active"
  initial_credit = 1
}
$managedUserID = $managedUser.data.id
Invoke-ApiJson "PUT" "/admin/users/$managedUserID" $adminToken @{
  name = "Phase 11 Guru Updated"
  email = "phase11_$suffix@teachery.local"
} | Out-Null

$creditAdjustment = Invoke-ApiJson "POST" "/admin/users/$managedUserID/credits/adjust" $adminToken @{
  amount = 4
  type = "admin_add"
  reason = "Phase 11 credit success"
}
Assert-True ($creditAdjustment.data.balance.balance -eq 5) "Credit adjustment did not update balance"
Expect-ApiError "POST" "/admin/users/$managedUserID/credits/adjust" 422 "NEGATIVE_BALANCE_NOT_ALLOWED" $adminToken @{
  amount = -999
  type = "admin_subtract"
  reason = "Phase 11 negative balance"
} | Out-Null

$managedLogin = Login "phase11_$suffix@teachery.local" "password123"
$managedToken = $managedLogin.data.access_token
$insufficientAssessment = Invoke-ApiJson "POST" "/assessments" $managedToken @{
  title = "Insufficient Credit Assessment"
  subject = "Matematika"
  grade = "Kelas 7"
  creation_mode = "manual"
}
$insufficientInput = @{
  assessment_id = $insufficientAssessment.data.id
  creation_mode = "ai"
  title = "Insufficient Credit Assessment"
  subject = "Matematika"
  grade = "Kelas 7"
  material_text = "Materi bilangan bulat untuk estimasi dan validasi Kredit."
  question_type = "multiple_choice"
  question_count = 9
  difficulty = "medium"
  include_explanation = $true
}
$estimate = Invoke-ApiJson "POST" "/credit/estimate" $managedToken @{
  type = "generate_questions"
  input = $insufficientInput
}
Assert-True (-not $estimate.data.is_sufficient) "Insufficient credit estimate should be false"
Expect-ApiError "POST" "/jobs" 422 "INSUFFICIENT_CREDIT" $managedToken @{
  type = "generate_questions"
  input = $insufficientInput
} | Out-Null

$materialPath = Join-Path $env:TEMP "teachery_phase11_material.pdf"
"Materi pecahan: pecahan senilai, penjumlahan pecahan, dan penyederhanaan pecahan." | Set-Content -Path $materialPath -Encoding UTF8
$material = Upload-Material $guruToken $materialPath
Assert-True ($material.data.extracted_text_length -gt 10) "Material extraction returned empty text"

$manualAssessment = Invoke-ApiJson "POST" "/assessments" $guruToken @{
  title = "Phase 11 Manual Assessment"
  subject = "Matematika"
  grade = "Kelas 7"
  creation_mode = "manual"
}
$manualAssessmentID = $manualAssessment.data.id
Invoke-ApiJson "PUT" "/assessments/$manualAssessmentID" $guruToken @{
  title = "Phase 11 Manual Assessment"
  subject = "Matematika"
  grade = "Kelas 7"
  status = "ready_to_export"
} | Out-Null
$manualExport = Invoke-ApiJson "POST" "/assessments/$manualAssessmentID/exports" $guruToken @{
  output_types = @("pdf")
  include_answer_key = $true
  include_explanation = $true
}
Assert-True ($manualExport.data.status -eq "completed") "Manual assessment export failed"

$balanceBefore = Invoke-ApiJson "GET" "/me/credit-balance" $guruToken
$aiAssessment = Invoke-ApiJson "POST" "/assessments" $guruToken @{
  title = "Phase 11 AI Assessment"
  subject = "Matematika"
  grade = "Kelas 7"
  creation_mode = "manual"
}
$aiAssessmentID = $aiAssessment.data.id
$aiInput = @{
  assessment_id = $aiAssessmentID
  creation_mode = "ai"
  title = "Phase 11 AI Assessment"
  subject = "Matematika"
  grade = "Kelas 7"
  material_text = $material.data.extracted_text
  material_source_filename = $material.data.source_filename
  question_type = "multiple_choice"
  question_count = 2
  difficulty = "medium"
  include_explanation = $true
}
$job = Invoke-ApiJson "POST" "/jobs" $guruToken @{
  type = "generate_questions"
  input = $aiInput
}
Assert-True ($job.data.status -eq "completed") "AI job did not complete"
$balanceAfter = Invoke-ApiJson "GET" "/me/credit-balance" $guruToken
Assert-True (($balanceBefore.data.balance - $balanceAfter.data.balance) -eq 2) "AI job did not charge expected credit"

$detail = Invoke-ApiJson "GET" "/assessments/$aiAssessmentID" $guruToken
Assert-True (@($detail.data.questions).Count -eq 2) "AI assessment does not contain generated questions"
$firstQuestion = $detail.data.questions[0]
$questionBody = @{
  id = $firstQuestion.id
  number = $firstQuestion.number
  type = $firstQuestion.type
  difficulty = $firstQuestion.difficulty
  prompt = "$($firstQuestion.prompt) (edited)"
  image_url = "https://example.com/image.png"
  correct_answer = $firstQuestion.correct_answer
  explanation = $firstQuestion.explanation
  blueprint_item = $firstQuestion.blueprint_item
  answer_options = $firstQuestion.answer_options
}
$updatedQuestion = Invoke-ApiJson "PUT" "/assessments/$aiAssessmentID/questions/$($firstQuestion.id)" $guruToken $questionBody
Assert-True ($updatedQuestion.data.image_url -eq "https://example.com/image.png") "Question image_url was not saved"

$improveJob = Invoke-ApiJson "POST" "/assessments/$aiAssessmentID/questions/$($firstQuestion.id)/improve" $guruToken @{
  instruction = "Buat kalimat lebih jelas."
  difficulty = $firstQuestion.difficulty
}
Assert-True ($improveJob.data.status -eq "completed") "Improve question job did not complete"

$failedBalanceBefore = Invoke-ApiJson "GET" "/me/credit-balance" $guruToken
$failedAssessment = Invoke-ApiJson "POST" "/assessments" $guruToken @{
  title = "Phase 11 Failed AI"
  subject = "Matematika"
  grade = "Kelas 7"
  creation_mode = "manual"
}
$failedInput = @{
  assessment_id = $failedAssessment.data.id
  creation_mode = "ai"
  title = "Phase 11 Failed AI"
  subject = "Matematika"
  grade = "Kelas 7"
  material_text = "provider_fail materi untuk memicu provider failure"
  question_type = "multiple_choice"
  question_count = 1
  difficulty = "medium"
  include_explanation = $true
}
$failedJob = Invoke-ApiJson "POST" "/jobs" $guruToken @{
  type = "generate_questions"
  input = $failedInput
}
Assert-True ($failedJob.data.status -eq "failed") "Expected failed AI job"
$failedBalanceAfter = Invoke-ApiJson "GET" "/me/credit-balance" $guruToken
Assert-True ($failedBalanceBefore.data.balance -eq $failedBalanceAfter.data.balance) "Failed AI job changed credit balance"

$otherUser = Invoke-ApiJson "POST" "/admin/users" $adminToken @{
  name = "Phase 11 Other Guru"
  email = "phase11_other_$suffix@teachery.local"
  password = "password123"
  role = "guru"
  status = "active"
  initial_credit = 10
}
$otherLogin = Login "phase11_other_$suffix@teachery.local" "password123"
$otherToken = $otherLogin.data.access_token
Expect-ApiError "GET" "/assessments/$aiAssessmentID" 404 "RESOURCE_NOT_FOUND" $otherToken | Out-Null
Expect-ApiError "GET" "/exports/$($manualExport.data.id)" 404 "RESOURCE_NOT_FOUND" $otherToken | Out-Null

$adminJobs = Invoke-ApiJson "GET" "/admin/jobs?status=completed" $adminToken
Assert-True (@($adminJobs.data).Count -ge 1) "Admin job monitoring did not return completed jobs"
$adminTransactions = Invoke-ApiJson "GET" "/admin/credits/transactions?type=ai_charge&status=success" $adminToken
Assert-True (@($adminTransactions.data).Count -ge 1) "Admin credit transaction filter did not return AI charge"
$adminAudit = Invoke-ApiJson "GET" "/admin/audit-logs?event_type=ai_job_completed" $adminToken
Assert-True (@($adminAudit.data).Count -ge 1) "Admin audit log did not return AI completion"

$adminUsersRaw = (Invoke-ApiJson "GET" "/admin/users" $adminToken | ConvertTo-Json -Depth 20)
Assert-True (-not $adminUsersRaw.Contains("password_hash")) "password_hash leaked in admin users response"
Assert-True (-not ($manualExport.data | ConvertTo-Json -Depth 20).Contains("storage")) "internal file path leaked in export response"

[pscustomobject]@{
  status = "passed"
  admin_user_flow = $managedUserID
  manual_assessment = $manualAssessmentID
  ai_assessment = $aiAssessmentID
  ai_job = $job.data.id
  failed_job = $failedJob.data.id
  export = $manualExport.data.id
} | ConvertTo-Json -Depth 5
