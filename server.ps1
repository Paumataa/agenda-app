$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:3000/')
$listener.Start()
Write-Host "Agenda App running at http://localhost:3000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    $path = $req.Url.LocalPath.TrimStart('/')
    if ($path -eq '' -or $path -eq '/') { $path = 'index.html' }
    $file = 'C:\Users\Pau\documents\apps\agenda-app\' + $path.Replace('/', '\')
    if (Test-Path $file -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $ext = [System.IO.Path]::GetExtension($file)
        $mime = @{
            '.html' = 'text/html; charset=utf-8'
            '.css'  = 'text/css'
            '.js'   = 'application/javascript'
            '.svg'  = 'image/svg+xml'
            '.png'  = 'image/png'
            '.jpg'  = 'image/jpeg'
            '.webp' = 'image/webp'
            '.avif' = 'image/avif'
        }[$ext]
        if (-not $mime) { $mime = 'application/octet-stream' }
        $res.ContentType = $mime
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $res.StatusCode = 404
        $res.Close()
        continue
    }
    $res.Close()
}
