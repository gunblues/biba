
importScripts('config.js');

// This set stores the tab IDs that our extension has opened.
const ourOpenedTabs = new Set();

chrome.runtime.onInstalled.addListener(() => {
  console.log('Background: Extension installed or updated. Setting default preferences.');
  chrome.storage.sync.set({
    'etmall.com.tw': false,
    'books.com.tw': false,
    'rakuten.com.tw': false
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background: Message received', message, 'from tab', sender.tab ? sender.tab.id : 'N/A');

  if (message.action === 'startPriceComparison') {
    const senderTabId = sender.tab.id;

    // CRITICAL CHECK: If this tab was opened by our extension, ignore the request.
    if (ourOpenedTabs.has(senderTabId)) {
      console.log(`Background: Ignoring request from extension-opened tab ${senderTabId}.`);
      return;
    }

    // This is a new, user-initiated comparison.
    console.log(`Background: Starting new comparison from initiator tab ${senderTabId}`);
    // No longer clearing storage here, as popup will manage its own state.

    // Find the current site from the new config.sites structure
    let currentSite = null;
    for (const countryCode in config.sites) {
        currentSite = config.sites[countryCode].find(site => message.url.includes(site.hostname));
        if (currentSite) break;
    }

    if (currentSite) {
        chrome.storage.sync.get([currentSite.hostname], (result) => {
            const isCurrentSiteEnabled = result[currentSite.hostname] !== false; // Default to true
            if (isCurrentSiteEnabled) {
                let keyword = cleanTitle(message.title, currentSite.name);
                console.log('Background: Keyword from Title:', keyword);
                if (keyword) {
                    openSearchTabs(keyword, currentSite);
                }
            } else {
                console.log(`Background: Current site ${currentSite.name} is disabled by user. Not opening new tabs.`);
            }
        });
    } else {
        console.log('Background: Could not find site config for current URL.');
    }

  } else if (message.action === 'getSiteList') {
    console.log('Background: Received getSiteList request.');
    // Respond with the list of sites from config.js
    // Flatten the sites object into an array for popup.js
    const allSites = Object.values(config.sites).flat();
    console.log('Background: config.sites content:', config.sites);
    console.log('Background: Flattened allSites:', allSites);
    sendResponse({ siteList: allSites });
    console.log('Background: Sent siteList response.');
  } else if (message.action === 'closeAllOpenedTabs') {
    console.log('Background: Received request to close all opened tabs. Current ourOpenedTabs:', Array.from(ourOpenedTabs));
    const tabsToClose = Array.from(ourOpenedTabs); // Create a snapshot to iterate over
    tabsToClose.forEach(tabId => {
      chrome.tabs.remove(tabId, () => {
        if (chrome.runtime.lastError) {
          console.error(`Background: Error closing tab ${tabId}:`, chrome.runtime.lastError.message);
        } else {
          console.log(`Background: Successfully closed tab ${tabId}.`);
        }
        // Remove from ourOpenedTabs only after the attempt to close
        ourOpenedTabs.delete(tabId);
        console.log(`Background: Removed tab ${tabId} from ourOpenedTabs. Current set:`, Array.from(ourOpenedTabs));
      });
    });
    // Do NOT clear ourOpenedTabs here. It will be cleared by individual callbacks or onRemoved listener.
  }
});

// Clean up ourOpenedTabs set when a tab is closed.
chrome.tabs.onRemoved.addListener((tabId) => {
    if (ourOpenedTabs.has(tabId)) {
        ourOpenedTabs.delete(tabId);
        console.log(`Background: Tab ${tabId} closed, removed from ourOpenedTabs set. Current set:`, Array.from(ourOpenedTabs));
    }
});

function cleanTitle(title, siteName) {
    let cleaned = title.split('-')[0].split('|')[0].trim();

    if (cleaned.length > 20) {
        const firstSpaceIndex = cleaned.indexOf(' ', 20); // Find first space after 20th character
        if (firstSpaceIndex !== -1) {
            cleaned = cleaned.substring(0, firstSpaceIndex);
        } else {
            // If no space found after 20th char, fallback to a fixed max length
            if (cleaned.length > 30) {
                cleaned = cleaned.substring(0, 30);
            }
        }
    }
    return cleaned;
}

function openSearchTabs(keyword, currentSite) {
  // Find the country of the current site
  let currentCountry = null;
  for (const countryCode in config.sites) {
    if (config.sites[countryCode].some(site => site.hostname === currentSite.hostname)) {
      currentCountry = countryCode;
      break;
    }
  }

  if (!currentCountry) {
    console.log('Background: Could not determine country for current site.');
    return;
  }

  // Only open tabs for sites within the same country
  config.sites[currentCountry].forEach(site => {
    if (site.name !== currentSite.name) {
      chrome.storage.sync.get([site.hostname, 'momoMemId'], (result) => {
        const isTargetSiteEnabled = result[site.hostname] !== false; // Default to true
        if (isTargetSiteEnabled) {
          let searchUrl = site.searchUrl.replace('{keyword}', encodeURIComponent(keyword));
          
          // Handle momo memid
          if (site.hostname === 'momo.com.tw') {
            const memid = result.momoMemId || '6000013715';
            searchUrl = searchUrl.replace('{memid}', memid);
          }

          chrome.tabs.create({ url: searchUrl }, (newTab) => {
            if (newTab && newTab.id) {
              ourOpenedTabs.add(newTab.id);
              console.log(`Background: Added tab ${newTab.id} to ourOpenedTabs. Current set:`, Array.from(ourOpenedTabs));
            } else {
              console.error(`Background: Failed to create tab for ${site.name} or newTab.id is missing.`);
            }
          });
        } else {
          console.log(`Background: Target site ${site.name} is disabled by user. Not opening tab.`);
        }
      });
    }
  });
}
