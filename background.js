
importScripts('config.js');

// This set stores the tab IDs that our extension has opened.
// It will be loaded from storage on service worker startup.
let ourOpenedTabs = new Set();

// Function to load tab IDs from storage
async function loadOpenedTabs() {
  try {
    const result = await chrome.storage.local.get(['ourOpenedTabs']);
    if (result.ourOpenedTabs) {
      ourOpenedTabs = new Set(result.ourOpenedTabs);
      console.log('Background: Loaded ourOpenedTabs from storage:', Array.from(ourOpenedTabs));
    }
  } catch (error) {
    console.error('Background: Error loading ourOpenedTabs from storage:', error);
  }
}

// Function to save tab IDs to storage
async function saveOpenedTabs() {
  try {
    await chrome.storage.local.set({ ourOpenedTabs: Array.from(ourOpenedTabs) });
    console.log('Background: Saved ourOpenedTabs to storage:', Array.from(ourOpenedTabs));
  } catch (error) {
    console.error('Background: Error saving ourOpenedTabs to storage:', error);
  }
}

// Load opened tabs when the service worker starts
loadOpenedTabs();

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
    console.log(`Background: Received startPriceComparison from tab ${senderTabId}.`);

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
        console.log(`Background: Found current site config: ${currentSite.name}`);
        chrome.storage.sync.get([currentSite.hostname], (result) => {
            console.log(`Background: Storage result for ${currentSite.hostname}:`, result);
            const isCurrentSiteEnabled = result[currentSite.hostname] !== false; // Default to true
            if (isCurrentSiteEnabled) {
                console.log(`Background: Current site ${currentSite.name} is enabled.`);
                let keyword = cleanTitle(message.title, currentSite.name);
                console.log('Background: Keyword after cleanTitle:', keyword);
                if (keyword) {
                    openSearchTabs(keyword, currentSite);
                    console.log('Background: openSearchTabs called.');
                } else {
                    console.log('Background: Keyword is empty after cleaning, not opening tabs.');
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
        // ourOpenedTabs.delete(tabId) is handled by chrome.tabs.onRemoved.addListener
      });
    });
    ourOpenedTabs.clear(); // Clear the set immediately
    saveOpenedTabs(); // Save the empty set to storage
  }
});

// Clean up ourOpenedTabs set when a tab is closed.
chrome.tabs.onRemoved.addListener((tabId) => {
    if (ourOpenedTabs.has(tabId)) {
        ourOpenedTabs.delete(tabId);
        saveOpenedTabs(); // Save state after removing a tab
        console.log(`Background: Tab ${tabId} closed, removed from ourOpenedTabs set. Current set:`, Array.from(ourOpenedTabs));
    }
});

function cleanTitle(title, siteName) {
    console.log(`cleanTitle: Original title: "${title}" for site: ${siteName}`);
    // Remove content within 【】
    let cleaned = title.replace(/【[^】]*】/g, '');
    console.log(`cleanTitle: After removing 【】: "${cleaned}"`);
    // Replace emojis with spaces (using a more comprehensive regex)
    // This regex attempts to cover a broad range of Unicode emoji blocks and presentation selectors.
    // It might still not catch all, but should be more robust than previous.
    cleaned = cleaned.replace(/(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|[\uFE00-\uFE0F])/g, ' ');
    console.log(`cleanTitle: After replacing emojis: "${cleaned}"`);
    // Remove any remaining replacement characters (U+FFFD)
    cleaned = cleaned.replace(/\uFFFD/g, ' ');
    console.log(`cleanTitle: After removing replacement characters: "${cleaned}"`);
    // Further cleaning (original logic)
    cleaned = cleaned.split('-')[0].split('|')[0].trim();
    console.log(`cleanTitle: After splitting and trimming: "${cleaned}"`);

    if (cleaned.length > 20) {
        const firstSpaceIndex = cleaned.indexOf(' ', 20); // Find first space after 20th character
        if (firstSpaceIndex !== -1) {
            cleaned = cleaned.substring(0, firstSpaceIndex);
            console.log(`cleanTitle: After length truncation (space): "${cleaned}"`);
        } else {
            // If no space found after 20th char, fallback to a fixed max length
            if (cleaned.length > 30) {
                cleaned = cleaned.substring(0, 30);
                console.log(`cleanTitle: After length truncation (fixed): "${cleaned}"`);
            }
        }
    }
    console.log(`cleanTitle: Final cleaned title: "${cleaned}"`);
    return cleaned;
}

function openSearchTabs(keyword, currentSite) {
  console.log(`openSearchTabs: Called with keyword: "${keyword}" and currentSite: ${currentSite.name}`);
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
  console.log(`openSearchTabs: Determined current country: ${currentCountry}`);

  // Only open tabs for sites within the same country
  config.sites[currentCountry].forEach(site => {
    console.log(`openSearchTabs: Processing target site: ${site.name}`);
    if (site.name !== currentSite.name) {
      chrome.storage.sync.get([site.hostname, 'momoMemId'], (result) => {
        console.log(`openSearchTabs: Storage result for target site ${site.hostname}:`, result);
        const isTargetSiteEnabled = result[site.hostname] !== false; // Default to true
        if (isTargetSiteEnabled) {
          console.log(`openSearchTabs: Target site ${site.name} is enabled.`);
          let searchUrl = site.searchUrl.replace('{keyword}', encodeURIComponent(keyword));
          
          // Handle momo memid
          if (site.hostname === 'momo.com.tw') {
            const memid = result.momoMemId || '6000013715';
            searchUrl = searchUrl.replace('{memid}', memid);
            console.log(`openSearchTabs: Momo search URL with memid: ${searchUrl}`);
          }
          console.log(`openSearchTabs: Creating tab for URL: ${searchUrl}`);
          chrome.tabs.create({ url: searchUrl }, (newTab) => {
            if (newTab && newTab.id) {
              ourOpenedTabs.add(newTab.id);
              saveOpenedTabs(); // Save state after adding a new tab
              console.log(`Background: Added tab ${newTab.id} to ourOpenedTabs. Current set:`, Array.from(ourOpenedTabs));
            } else {
              console.error(`Background: Failed to create tab for ${site.name} or newTab.id is missing.`);
            }
          });
        } else {
          console.log(`openSearchTabs: Target site ${site.name} is disabled by user. Not opening tab.`);
        }
      });
    } else {
        console.log(`openSearchTabs: Skipping current site ${site.name}.`);
    }
  });
}

