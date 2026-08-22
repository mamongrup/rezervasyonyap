$r1 = Invoke-WebRequest -Uri 'http://127.0.0.1:8090/htmx' -UseBasicParsing
$r2 = Invoke-WebRequest -Uri 'http://127.0.0.1:8090/assets/css/chisfis.css' -UseBasicParsing
$r3 = Invoke-WebRequest -Uri 'http://127.0.0.1:8090/assets/images/category/hotel/01.jpg' -UseBasicParsing
$r4 = Invoke-WebRequest -Uri 'http://127.0.0.1:8090/assets/vendor/font-awesome/css/all.min.css' -UseBasicParsing
$r5 = Invoke-WebRequest -Uri 'http://127.0.0.1:8090/htmx/api/search?q=kas' -UseBasicParsing

[PSCustomObject]@{
    HTMX_ChisFis_Page = $r1.StatusCode
    ChisFis_CSS = $r2.StatusCode
    ChisFis_CSS_Size = "$([math]::Round($r2.Content.Length / 1024, 1)) KB"
    Category_Image = $r3.StatusCode
    FontAwesome_CSS = $r4.StatusCode
    HTMX_LiveSearch = $r5.StatusCode
    HTMX_LiveSearch_Length = $r5.Content.Length
} | Format-List
