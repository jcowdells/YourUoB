// on calendar open
addURLRequestMapping("GET", "api.myday.cloud/legacy/api/aggregate/v2/calendaritem.*", (method, url) => {
    const urlObj = new URL(url);

    // each time calendar is loaded, use the opportunity to update stuff
    // firstly, scrape the UoB MyDay Collabco calendar for lectures/seminars etc.

    // start date yesterday
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);

    // end date in 90 days time
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90);
    endDate.setHours(0, 0, 0, 0);

    // get iso standard strings
    const startIso = startDate.toISOString().replace(".000Z", "Z");
    const endIso = endDate.toISOString().replace(".000Z", "Z");

    // current endpoint for the calendar
    const customRange = `End gt datetime'${startIso}' and Start lt datetime'${endIso}'`;
    const originalRange = urlObj.searchParams.get("$filter");

    const fetch_url = `https://api.myday.cloud/legacy/api/aggregate/v2/calendaritem?$filter=(${originalRange}) or (${customRange})`;
    return [method, fetch_url];
});

// on calendar data download
addURLResponseMapping("GET", "api.myday.cloud/legacy/api/aggregate/v2/calendaritem.*", (method, url, status, response) => {
    console.log(response);

    try {
        // parse JSON data
        const jsonData = JSON.parse(response);
        const events = jsonData["results"];

        // fetch original filter dates
        const urlObj = new URL(url);
        const filterValues = urlObj.searchParams.get("$filter").split(" ");

        const startString = filterValues[2];
        const endString = filterValues[6];

        const startDate = new Date(startString.substring(9, startString.length - 1)); // ultimate bodge, i tried using odata-filter-parser but was unable to import it.
        const endDate = new Date(endString.substring(9, endString.length - 1));

        // filter data back to what was expected
        const filteredEvents = events.filter(item => {
            const itemStartDate = new Date(item["Start"]);
            const itemEndDate = new Date(item["End"]);

            return itemEndDate.getTime() > startDate.getTime() && itemStartDate.getTime() < endDate.getTime();
        });

        // reset output back to how it was
        jsonData["results"] = filteredEvents;

        return [status, JSON.stringify(jsonData)];
    } catch {
        console.log("[YourUoB] Failed to parse calendar data to JSON.");
    }

    return [status, response];
});
