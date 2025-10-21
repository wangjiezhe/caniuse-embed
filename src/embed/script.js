/* *******************************
 *
 *   Global Variables
 *
 * ******************************* */

const OPTIONS = {};
/*
    OPTIONS: {
        featureID*,
        periods*,
        accessibleColours,
        imageBase,
        screenshot
    }
 */
const BROWSER_DATA = {};
/*
    BROWSER_DATA: {
        browserVersions: {
            chrome: {
                past_1: "80"
            }
        },
        browserUsage: {
            chrome: {
                past_1: "34.80"
            }
        }
    }
*/

let FEATURE = {};
/*
    FEATURE: {
        feature: {
            title*,

            description,
            usage_perc_y,
            usage_perc_a,
            global_a,

            stats[browser][BROWSER_DATA.versions[browser][period]]

            stats: {
                chrome: {

                }
            }
        }
    }
 */

const caniuseDataUrl = 'https://raw.githubusercontent.com/Fyrd/caniuse/main/fulldata-json/data-2.0.json';
const embedAPI = 'https://api.caniuse.wangjiezhe.com';

const BROWSERS = ['ie', 'edge', 'firefox', 'chrome', 'safari', 'ios_saf', 'op_mini', 'and_chr', 'android', 'samsung'];
const MDN_BROWSERS_KEY = {
    'ie': 'ie',
    'edge': 'edge',
    'firefox': 'firefox',
    'chrome': 'chrome',
    'safari': 'safari',
    'ios_saf': 'safari_ios',
    'op_mini': 'op_mini',
    'and_chr': 'chrome_android',
    'android': 'android',
    'samsung': 'samsunginternet_android',
};

const FEATURE_IDENTIFIERS = {
    supported: 'y',
    unsupported: 'n',
    partial: 'a',
    unknown: 'u',
    prefixed: 'x',
    flagged: 'd'
};



/* *******************************
 *
 *   Functions - Utilities
 *
 * ******************************* */

function setGlobalOptions() {
    const params = new URLSearchParams(window.location.search);
    const opts = {};

    // Set feature ID and data source
    opts.featureID = params.get('feat');
    opts.dataSource = opts.featureID?.startsWith('mdn-') ? 'mdn' : 'caniuse';

    // Set periods
    const periodsParam = params.get('periods');
    opts.periods = periodsParam ? periodsParam.split(',') : ['future_1', 'current', 'past_1', 'past_2'];

    opts.accessibleColours = params.get('accessible-colours') === 'true';

    const imageBaseParam = params.get('image-base');
    if (imageBaseParam !== 'none') {
        opts.imageBase = imageBaseParam;
    }

    opts.screenshot = params.get('screenshot') === 'true';

    Object.assign(OPTIONS, opts);
}

function getShortenedBrowserVersion(version) {
    if (version && version.includes('-')) {
        return version.split('-')[1];
    }
    return version;
}

async function get(url) {
    const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit'
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

async function post(url, body) {
    const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}



/* *******************************
 *
 *   Functions - Get Information
 *
 * ******************************* */

async function getFeature() {
    switch (OPTIONS.dataSource) {
        case 'mdn': {
            const url = `${embedAPI}/mdn-browser-compat-data`;
            const body = { feature: OPTIONS.featureID };

            const feature = await post(url, body);
            FEATURE = {
                url: feature.mdn_url,
                ...feature
            };

            return await getBrowserData();
        }

        case 'caniuse': {
            const res = await get(caniuseDataUrl);
            FEATURE = {
                url: `https://caniuse.com/#feat=${OPTIONS.featureID}`,
                ...res.data[OPTIONS.featureID]
            };

            return await getBrowserData(res.agents);
        }
    }
}

async function getBrowserData(agents) {
    if (!agents) {
        const res = await get(caniuseDataUrl);
        agents = res.agents;
    }
    return parseBrowserData(agents);
}



/* *******************************
 *
 *   Functions - Parsing Data
 *
 * ******************************* */

function parseBrowserData(agents) {
    const browserVersions = {};

    for (const browser of BROWSERS) {
        // GET INDEX OF CURRENT VERSION
        const currentVersion = agents[browser].current_version;
        let currentVersionIndex;

        for (let x = 0; x < agents[browser].version_list.length; x++) {
            if (agents[browser].version_list[x].era === 0) {
                currentVersionIndex = x;
                break;
            }
        }

        browserVersions[browser] = {};

        for (const period of OPTIONS.periods) {
            if (period === 'current') {
                browserVersions[browser][period] = currentVersion;
            } else if (period.includes('past')) {
                const n = parseInt(period.split('_')[1]);
                browserVersions[browser][period] = agents[browser].version_list[currentVersionIndex - n]?.version || null;
            } else if (period.includes('future')) {
                const n = parseInt(period.split('_')[1]);
                browserVersions[browser][period] = agents[browser].version_list[currentVersionIndex + n]?.version || null;
            }
        }
    }

    const browserUsage = {};

    for (const browser of BROWSERS) {
        browserUsage[browser] = {};

        for (const period of OPTIONS.periods) {
            const period_version = browserVersions[browser][period];
            let period_usage = agents[browser].usage_global[period_version];
            period_usage = period_usage ? period_usage.toFixed(2) : 0;
            browserUsage[browser][period] = period_usage;
        }
    }

    Object.assign(BROWSER_DATA, {
        versions: browserVersions,
        usage: browserUsage
    });

    return BROWSER_DATA;
}

function parseSupportData() {
    const browserSupport = {};

    function parseCanIUseData(browser, period) {
        browserSupport[browser][period] = FEATURE.stats[browser][BROWSER_DATA.versions[browser][period]];
    }

    function parseMDNData(browser, period) {
        if (!BROWSER_DATA.versions[browser][period]) return;

        const supportData = FEATURE.support[MDN_BROWSERS_KEY[browser]];
        if (!supportData) {
            browserSupport[browser][period] = FEATURE_IDENTIFIERS.unknown;
            return;
        }

        const this_version = BROWSER_DATA.versions[browser][period];

        function getValue(key) {
            let val = supportData[key];

            if (!val && supportData[0]?.[key]) {
                val = supportData[0][key];
            } else if (!val && supportData[1]?.[key]) {
                val = supportData[1][key];
            }

            if (val) {
                val = val.replace(/≤/g, '');
            }
            return val;
        }

        const version_added = getValue('version_added');
        const version_removed = getValue('version_removed');

        let isSupported = false;

        if (version_added === true) {
            isSupported = true;
        } else if (this_version === 'TP' && version_added > 0) {
            isSupported = true;
        } else if (parseFloat(this_version) >= parseFloat(version_added)) {
            isSupported = true;
        }

        if (version_removed && (parseFloat(this_version) <= parseFloat(version_removed))) {
            isSupported = false;
        }

        const supportString = isSupported ? FEATURE_IDENTIFIERS.supported : FEATURE_IDENTIFIERS.unsupported;
        browserSupport[browser][period] = supportString;
    }

    for (const browser of BROWSERS) {
        browserSupport[browser] = {};

        for (const period of OPTIONS.periods) {
            switch (OPTIONS.dataSource) {
                case 'mdn':
                    parseMDNData(browser, period);
                    break;
                case 'caniuse':
                    parseCanIUseData(browser, period);
                    break;
            }
        }
    }

    return browserSupport;
}



/* *******************************
 *
 *   Functions - Displaying Data
 *
 * ******************************* */

function displayLoadingMessage() {
    let defaultMessage;

    if (!OPTIONS.featureID) {
        defaultMessage = 'No feature ID was specified';
    } else if (OPTIONS.imageBase) {
        defaultMessage = `<picture>
            <source type="image/webp" srcset="${OPTIONS.imageBase}.webp">
            <source type="image/png" srcset="${OPTIONS.imageBase}.png">
            <source type="image/jpeg" srcset="${OPTIONS.imageBase}.jpg">
            <img src="${OPTIONS.imageBase}.png" alt="Data on support for the ${OPTIONS.featureID} feature across the major browsers">
            </picture>`;
    } else {
        defaultMessage = `Can I Use ${OPTIONS.featureID}? Data on support for the ${OPTIONS.featureID} feature across the major browsers. (Embed Loading)`;
    }

    document.getElementById('defaultMessage').innerHTML = defaultMessage;
}

async function displayFeatureInformation() {
    document.getElementById('featureTitle').textContent = FEATURE.title;

    if (FEATURE.url !== undefined) {
        document.getElementById('featureLink').href = FEATURE.url;
    } else {
        const featureLink = document.getElementById('featureLink');
        const spanElement = featureLink.querySelector('span');
        featureLink.outerHTML = spanElement.outerHTML;
    }

    if (FEATURE.description) {
        let featureDescription = FEATURE.description
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/&lt;code&gt;/g, '')
            .replace(/&lt;\/code&gt;/g, '');
        document.getElementById('featureDescription').innerHTML = featureDescription;
    }

    if (FEATURE.usage_perc_y) {
        const global_y = FEATURE.usage_perc_y;
        const global_a = FEATURE.usage_perc_a;
        const global_total = (global_y + global_a).toFixed(2);

        document.getElementById('note').innerHTML = `Global: <span class="y">${global_y}%</span> + <span class="a">${global_a}%</span> = ${global_total}%`;
    } else if (FEATURE.status) {
        if (FEATURE.status.experimental) {
            document.getElementById('note').innerHTML = '<strong>Experimental</strong> feature';
        } else if (FEATURE.status.deprecated) {
            document.getElementById('note').innerHTML = '<strong>Deprecated</strong> feature';
        }
    }

    if (OPTIONS.accessibleColours) {
        document.body.classList.add('accessible-colours');
    }

    if (OPTIONS.screenshot) {
        document.body.classList.add('screenshot');

        const d = new Date();
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        document.getElementById('footer-right').innerHTML = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        document.querySelector('.icon-external-link').setAttribute('hidden', 'true');
    } else {
        document.getElementById('accessibleColoursToggle').addEventListener('click', () => {
            document.body.classList.toggle('accessible-colours');
        });
    }

    switch (OPTIONS.dataSource) {
        case 'mdn':
            document.getElementById('footer-left').innerHTML = 'Data from <a href="https://github.com/mdn/browser-compat-data">MDN</a> | Embed from <a href="https://caniuse.wangjiezhe.com">caniuse.wangjiezhe.com</a>';
            break;
        case 'caniuse':
            document.getElementById('footer-left').innerHTML = 'Data from <a href="https://caniuse.com">caniuse.com</a> | Embed from <a href="https://caniuse.wangjiezhe.com">caniuse.wangjiezhe.com</a>';
            break;
    }

    document.body.classList.add(OPTIONS.dataSource);
}

function displayTable(featureSupport) {
    // Create empty table cells for each browser and each period
    for (let i = OPTIONS.periods.length - 1; i > -1; i--) {
        let tableCells = '';

        for (const browser of BROWSERS) {
            tableCells += `<td class="${browser}"></td>`;
        }

        const row = document.createElement('tr');
        row.className = `statistics ${OPTIONS.periods[i]}`;
        row.innerHTML = tableCells;
        document.getElementById('tableBody').appendChild(row);
    }

    // DISPLAY DATA
    let hasPrefixed = false;
    let hasUnknown = false;
    let hasFlag = false;

    for (const browser of BROWSERS) {
        for (const period of OPTIONS.periods) {
            const row = document.getElementsByClassName(period)[0];
            const rowChildren = Array.from(row.childNodes);
            const period_element = rowChildren.find(child =>
                child.className?.includes(browser)
            );

            if (!period_element) continue;

            // ADD SUPPORT CLASS TO TABLE CELL
            if (featureSupport[browser][period] !== undefined) {
                period_element.className += ` ${featureSupport[browser][period]}`;
            }
            // GET VERSION NUMBER + BROWSER USAGE
            const browserVersion = getShortenedBrowserVersion(BROWSER_DATA.versions[browser][period]);
            const versionString = `<span>${browserVersion}</span><span class="usage">${BROWSER_DATA.usage[browser][period]}%</span>`;

            // ADD VERSION NUMBER TO TABLE CELL
            if (BROWSER_DATA.versions[browser][period] !== null) {
                period_element.innerHTML = versionString;
            } else {
                period_element.innerHTML = '<span></span>';
            }

            // CHECK IF ANY HAS PREFIX OR UNKNOWN
            if (featureSupport[browser][period]?.includes(FEATURE_IDENTIFIERS.prefixed)) {
                hasPrefixed = true;
            }
            if (featureSupport[browser][period]?.includes(FEATURE_IDENTIFIERS.unknown)) {
                hasUnknown = true;
            }
            if (featureSupport[browser][period]?.includes(FEATURE_IDENTIFIERS.flagged)) {
                hasFlag = true;
            }
        }
    }

    // DISPLAY PREFIX LEGEND IF DATA HAS PREFIXED
    document.getElementById('legendX').style.display = hasPrefixed ? 'inline-block' : 'none';
    document.getElementById('legendU').style.display = hasUnknown ? 'inline-block' : 'none';
    document.getElementById('legendD').style.display = hasFlag ? 'inline-block' : 'none';
}

function postDocumentHeight() {
    const documentHeight = document.getElementsByClassName('feature')[0].scrollHeight;
    const infoString = `ciu_embed:${OPTIONS.featureID}:${documentHeight}`;
    parent.postMessage(infoString, '*');

    window.onresize = () => {
        const newDocumentHeight = document.getElementsByClassName('feature')[0].scrollHeight;
        const newInfoString = `ciu_embed:${OPTIONS.featureID}:${newDocumentHeight}`;
        parent.postMessage(newInfoString, '*');
    }
}



/* *******************************
 *
 *   Start
 *
 * ******************************* */

async function initialize() {
    setGlobalOptions();
    displayLoadingMessage();

    try {
        await getFeature();
        const featureSupport = parseSupportData();

        console.log(FEATURE);
        console.log(featureSupport);

        await displayFeatureInformation();
        displayTable(featureSupport);

        document.getElementById('defaultMessage').style.display = 'none';
        document.getElementsByClassName('feature')[0].style.display = 'block';

        postDocumentHeight();
    } catch (err) {
        document.getElementById('defaultMessage').innerHTML = 'Feature not found...';
        console.error(err);
    }
}

// Start the application
initialize();
