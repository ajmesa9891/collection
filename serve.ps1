param(
    [int]$Port = 8000,
    [switch]$NoBrowser
)

$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = (Get-Location).Path }

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".mjs"  = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".mp3"  = "audio/mpeg"
    ".wav"  = "audio/wav"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".ico"  = "image/x-icon"
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Error "Could not start server on port $($Port): $_"
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  🚀 Local Development Server Running" -ForegroundColor Green
Write-Host "  👉 URL: $prefix" -ForegroundColor Yellow
Write-Host "  Serving: $rootDir" -ForegroundColor Gray
Write-Host "  No build step required - edit files and hit Refresh (F5)" -ForegroundColor Gray
Write-Host "  Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not $NoBrowser) {
    try {
        Start-Process $prefix
    } catch {
        # Fallback if opening browser fails
    }
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawUrl = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
        $cleanRelative = $rawUrl.TrimStart('/') -replace '/', '\'

        $filePath = Join-Path $rootDir $cleanRelative

        if (Test-Path $filePath -PathType Container) {
            if (-not $rawUrl.EndsWith('/')) {
                $response.StatusCode = 301
                $response.Headers.Add("Location", "$rawUrl/")
                $response.Close()
                continue
            }
            $filePath = Join-Path $filePath "index.html"
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }

            $response.ContentType = $mime
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")

            try {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.StatusCode = 200
            } catch {
                $response.StatusCode = 500
            }
        } else {
            $response.StatusCode = 404
            $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes("<!DOCTYPE html><html><body><h1>404 Not Found</h1><p>$rawUrl was not found.</p><p><a href='/'>Back to Collection</a></p></body></html>")
            $response.ContentType = "text/html; charset=utf-8"
            $response.ContentLength64 = $notFoundBytes.Length
            $response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
        }

        $response.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
