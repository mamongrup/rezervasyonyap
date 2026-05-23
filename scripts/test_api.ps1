try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8080/api/v1/catalog/manage-listings?page=1&per_page=3" -UseBasicParsing
    Write-Output "Status: $($response.StatusCode)"
    $content = $response.Content
    if ($content.Length -gt 1000) {
        Write-Output $content.Substring(0, 1000)
    } else {
        Write-Output $content
    }
} catch {
    Write-Output "Error: $($_.Exception.Message)"
}
