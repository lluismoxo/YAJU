# Servidor local para la copia de cohere.com
# Sirve las paginas en sus URLs reales (/about, /solutions/...), que es
# lo que el router de Next.js espera para arrancar correctamente.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$mime = @{
  ".html"="text/html; charset=utf-8"; ".css"="text/css"; ".js"="application/javascript"
  ".svg"="image/svg+xml"; ".webp"="image/webp"; ".png"="image/png"; ".jpg"="image/jpeg"
  ".jpeg"="image/jpeg"; ".gif"="image/gif"; ".avif"="image/avif"; ".json"="application/json"
  ".woff"="font/woff"; ".woff2"="font/woff2"; ".ttf"="font/ttf"; ".ico"="image/x-icon"
  ".webmanifest"="application/manifest+json"; ".txt"="text/plain"; ".mp4"="video/mp4"; ".xml"="application/xml"
}
$listener = New-Object System.Net.HttpListener
$port = 0
foreach ($p in 8899..8930) {
  try { $listener.Prefixes.Clear(); $listener.Prefixes.Add("http://127.0.0.1:$p/"); $listener.Start(); $port=$p; break } catch {}
}
if ($port -eq 0) { Write-Host "No hay puertos libres."; Read-Host "Enter para salir"; exit }
$url = "http://127.0.0.1:$port/"
Write-Host ""
Write-Host "  Copia local de cohere.com sirviendose en:" -ForegroundColor Green
Write-Host "  $url" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Deja esta ventana abierta mientras navegas. Ctrl+C para parar."
Write-Host ""
Start-Process $url

function Resolve-Path2([string]$rel) {
  $cands = @()
  if ($rel -eq "") { $cands += "index.html" }
  else {
    $cands += $rel
    $cands += ($rel.TrimEnd("/") + "/index.html")
    $cands += ($rel.TrimEnd("/") + ".html")
  }
  foreach ($c in $cands) {
    $p = Join-Path $root $c
    if (Test-Path -LiteralPath $p -PathType Leaf) { return $p }
  }
  return $null
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    $rel  = $path.TrimStart("/")
    $file = $null

    if ($path -eq "/_next/image") {
      # Next.js pide aqui sus imagenes optimizadas; servimos el fichero local directamente
      $inner = $ctx.Request.QueryString["url"]
      if ($inner) {
        $inner = [Uri]::UnescapeDataString($inner)
        $q = $inner.IndexOf("?"); if ($q -ge 0) { $inner = $inner.Substring(0,$q) }
        if ($inner.StartsWith("/")) { $file = Resolve-Path2 $inner.TrimStart("/") }
        if (-not $file) {
          $name = $inner.Substring($inner.LastIndexOf("/")+1)
          $stem = $name; $dot = $name.LastIndexOf("."); if ($dot -ge 0) { $stem = $name.Substring(0,$dot) }
          foreach ($ext in @(".webp",".svg",".png",".jpg",".gif")) {
            $try = Join-Path $root ("assets/img/" + $stem + $ext)
            if (Test-Path -LiteralPath $try -PathType Leaf) { $file = $try; break }
          }
        }
      }
    }
    elseif ($path.StartsWith("/_vercel/")) {
      # analitica de Vercel: no existe fuera de su plataforma, devolvemos vacio
      $ctx.Response.ContentType = "application/javascript"
      $ctx.Response.StatusCode = 200
      $ctx.Response.Close(); continue
    }
    else { $file = Resolve-Path2 $rel }

    if ($file) {
      $ext = [IO.Path]::GetExtension($file).ToLower()
      $ct = $mime[$ext]; if (-not $ct) { $ct = "application/octet-stream" }
      $b = [IO.File]::ReadAllBytes($file)
      $ctx.Response.ContentType = $ct
      $ctx.Response.ContentLength64 = $b.Length
      $ctx.Response.OutputStream.Write($b,0,$b.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $b = [Text.Encoding]::UTF8.GetBytes("404 " + $path)
      $ctx.Response.OutputStream.Write($b,0,$b.Length)
    }
    $ctx.Response.Close()
  } catch {}
}
