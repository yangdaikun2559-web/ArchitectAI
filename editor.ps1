(Get-Content $args[0]) -replace "^pick (.*aeea6f5.*)", "fixup `$1" | Set-Content $args[0]
