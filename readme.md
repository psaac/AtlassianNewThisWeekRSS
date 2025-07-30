# RSS feed using wiki Atlassian page

## How it works

The server parses wiki page of Atlassian : https://confluence.atlassian.com/cloud/blog  
It will search for span blocks with "aui-lozenge" class, filtering on "NEW THIS WEEK" by default.
Routes :

- https://host/ : HTML - main route, will retrieve "NEW THIS WEEK" of previous week
- https://host/{slug} : HTML - will retrieve "NEW THIS WEEK" of specified week, where slug is formatted as the format used on Atlassian wiki (eg. jun-30-to-jul-7-2025)
- https://host/rss : RSS - rss main route, will retrieve "NEW THIS WEEK" of previous week
- https://host/rss/previous : RSS - will retrieve "NEW THIS WEEK" of previous previous week
- https://host/rss/{slug} : RSS - will retrieve "NEW THIS WEEK" of specified week, where slug is formatted as the format used on Atlassian wiki (eg. jun-30-to-jul-7-2025)

Filter is available, by default filter "NEW THIS WEEK" is applied.  
Filter can be combined with routes like this : {route}?filter=COMING SOON. Eg. https://host/rss/previous?filter=COMING%20SOON  
Filter may be used with HTML or RSS (HTML view provides select list to change)  
Filters available :

- NEW THIS WEEK (default)
- COMING SOON
- ROLLING OUT

## Host

Server is hosted on render.com with this github account
