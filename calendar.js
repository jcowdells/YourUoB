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

        for (let item of filteredEvents) {
            item["ItemLink"] += `&id=${item["Subject"]}`
        }

        // reset output back to how it was
        jsonData["results"] = filteredEvents;

        return [status, JSON.stringify(jsonData)];
    } catch {
        console.log("[YourUoB] Failed to parse calendar data to JSON.");
    }

    return [status, response];
});

function onEventOpen(eventId) {
    const modalTitle = document.getElementById("event-modal-title");
    node = modalTitle.parentNode.firstChild;

    while (node) {
        if (node !== modalTitle && node.nodeType === Node.ELEMENT_NODE && node.tagName === "A") {
            console.log(node.href);
        } 
        node = node.nextElementSibling || node.nextSibling;
    }

    const modalBody = document.getElementById("event-modal-body");

    // create divider elements
    const dividerUl = document.createElement("ul");
    const dividerP = document.createElement("p");
    const dividerLine = document.createElement("div");
    dividerLine.classList.add("line");
    dividerLine.classList.add("line-dashed");
    dividerLine.classList.add("line-lg");
    dividerLine.classList.add("b-b");
    dividerLine.role = "separator";
    dividerLine.ariaHidden = "false";
    modalBody.appendChild(dividerUl);
    modalBody.appendChild(dividerP);
    modalBody.appendChild(dividerLine);

    // create edit div
    const editDiv = document.createElement("div")
    editDiv.classList.add("cc-event-description");
    editDiv.tabindex = "0";
    modalBody.appendChild(editDiv);

    // create title
    const titleP = document.createElement("p");
    titleP.classList.add("text-muted");
    titleP.textContent = "Edit:";
    editDiv.appendChild(titleP);


    // Use browser.runtime.getURL (or chrome.runtime.getURL)
    const htmlText = getResource("edit_form.html").then(htmlText => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        console.log(doc);
        editDiv.appendChild(doc.body.firstChild);
    });
}

function onEventClose(eventId) {
    console.log("Close Event");
}

// calendar app stuff
MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
let modal_active = false;

var observer = new MutationObserver(function(mutations, observer) {
    for (let mutation of mutations) {
        if (mutation.target.classList.contains("modal-backdrop")) {
            if (mutation.target.classList.contains("in")) {
                if (!modal_active)
                    onEventOpen(0);
                modal_active = true;
            } else {
                if (modal_active)
                    onEventClose(0);
                modal_active = false;                
            }
        }
    }
});

// define what element should be observed by the observer
// and what types of mutations trigger the callback
observer.observe(document, {
  subtree: true,
  attributes: true
});
