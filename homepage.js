const ALLOW_LINKS = [
    "a2fa0aac-5ba4-441d-9d6b-6c596759af3b", // calendar
    "2cfa36e7-2428-49db-b4ec-069c9b0f2411", // attendance
    "b166e4e2-e35b-4d11-b6b7-d8543402c160", // campus map
    "6bf26b8a-47c4-458b-a91e-96edc6ad46fb", // library loans
    "81d792eb-0de8-46d7-8fca-86750faaffa2"  // library availability
]

addURLResponseMapping("GET", "https://api.myday.cloud/links/sectioncollection/all", (method, url, status, response) => {
    try {
        // parse JSON data
        const jsonData = JSON.parse(response);
        
        // collect only the permitted links in order to appear on the page.
        let links = [];
        for (let allow_link of ALLOW_LINKS) {
            for (let link of jsonData) {
                if (link.section.id === allow_link)
                    links.push(link);
            }
        }

        return [status, JSON.stringify(links)];
    } catch {
        console.log("[YourUoB] Failed to parse configuration data to JSON.");
    }

    return [status, response];
});

addURLResponseMapping("GET", "https://files.mydaycdn.cloud/.*/theme.css", (method, url, status, response) => {
    console.log(response);
    return [status, response];
});
